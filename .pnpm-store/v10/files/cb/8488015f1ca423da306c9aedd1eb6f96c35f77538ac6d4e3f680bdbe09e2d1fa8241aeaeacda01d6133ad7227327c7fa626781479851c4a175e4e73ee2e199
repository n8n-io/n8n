/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import { Metadata } from './metadata';

export interface CallMetadataOptions {
  method_name: string;
  service_url: string;
}

export type CallMetadataGenerator = (
  options: CallMetadataOptions,
  cb: (err: Error | null, metadata?: Metadata) => void
) => void;

// google-auth-library pre-v2.0.0 does not have getRequestHeaders
// but has getRequestMetadata, which is deprecated in v2.0.0
export interface OldOAuth2Client {
  getRequestMetadata: (
    url: string,
    callback: (
      err: Error | null,
      headers?: {
        [index: string]: string;
      }
    ) => void
  ) => void;
}

export interface CurrentOAuth2Client {
  getRequestHeaders: (url?: string) => Promise<{ [index: string]: string }>;
}

export type OAuth2Client = OldOAuth2Client | CurrentOAuth2Client;

function isCurrentOauth2Client(
  client: OAuth2Client
): client is CurrentOAuth2Client {
  return (
    'getRequestHeaders' in client &&
    typeof client.getRequestHeaders === 'function'
  );
}

/**
 * A class that represents a generic method of adding authentication-related
 * metadata on a per-request basis.
 */
export abstract class CallCredentials {
  /**
   * Asynchronously generates a new Metadata object.
   * @param options Options used in generating the Metadata object.
   */
  abstract generateMetadata(options: CallMetadataOptions): Promise<Metadata>;
  /**
   * Creates a new CallCredentials object from properties of both this and
   * another CallCredentials object. This object's metadata generator will be
   * called first.
   * @param callCredentials The other CallCredentials object.
   */
  abstract compose(callCredentials: CallCredentials): CallCredentials;

  /**
   * Check whether two call credentials objects are equal. Separate
   * SingleCallCredentials with identical metadata generator functions are
   * equal.
   * @param other The other CallCredentials object to compare with.
   */
  abstract _equals(other: CallCredentials): boolean;

  /**
   * Creates a new CallCredentials object from a given function that generates
   * Metadata objects.
   * @param metadataGenerator A function that accepts a set of options, and
   * generates a Metadata object based on these options, which is passed back
   * to the caller via a supplied (err, metadata) callback.
   */
  static createFromMetadataGenerator(
    metadataGenerator: CallMetadataGenerator
  ): CallCredentials {
    return new SingleCallCredentials(metadataGenerator);
  }

  /**
   * Create a gRPC credential from a Google credential object.
   * @param googleCredentials The authentication client to use.
   * @return The resulting CallCredentials object.
   */
  static createFromGoogleCredential(
    googleCredentials: OAuth2Client
  ): CallCredentials {
    return CallCredentials.createFromMetadataGenerator((options, callback) => {
      let getHeaders: Promise<{ [index: string]: string }>;
      if (isCurrentOauth2Client(googleCredentials)) {
        getHeaders = googleCredentials.getRequestHeaders(options.service_url);
      } else {
        getHeaders = new Promise((resolve, reject) => {
          googleCredentials.getRequestMetadata(
            options.service_url,
            (err, headers) => {
              if (err) {
                reject(err);
                return;
              }
              if (!headers) {
                reject(new Error('Headers not set by metadata plugin'));
                return;
              }
              resolve(headers);
            }
          );
        });
      }
      getHeaders.then(
        headers => {
          const metadata = new Metadata();
          for (const key of Object.keys(headers)) {
            metadata.add(key, headers[key]);
          }
          callback(null, metadata);
        },
        err => {
          callback(err);
        }
      );
    });
  }

  static createEmpty(): CallCredentials {
    return new EmptyCallCredentials();
  }
}

class ComposedCallCredentials extends CallCredentials {
  constructor(private creds: CallCredentials[]) {
    super();
  }

  async generateMetadata(options: CallMetadataOptions): Promise<Metadata> {
    const base: Metadata = new Metadata();
    const generated: Metadata[] = await Promise.all(
      this.creds.map(cred => cred.generateMetadata(options))
    );
    for (const gen of generated) {
      base.merge(gen);
    }
    return base;
  }

  compose(other: CallCredentials): CallCredentials {
    return new ComposedCallCredentials(this.creds.concat([other]));
  }

  _equals(other: CallCredentials): boolean {
    if (this === other) {
      return true;
    }
    if (other instanceof ComposedCallCredentials) {
      return this.creds.every((value, index) =>
        value._equals(other.creds[index])
      );
    } else {
      return false;
    }
  }
}

class SingleCallCredentials extends CallCredentials {
  constructor(private metadataGenerator: CallMetadataGenerator) {
    super();
  }

  generateMetadata(options: CallMetadataOptions): Promise<Metadata> {
    return new Promise<Metadata>((resolve, reject) => {
      this.metadataGenerator(options, (err, metadata) => {
        if (metadata !== undefined) {
          resolve(metadata);
        } else {
          reject(err);
        }
      });
    });
  }

  compose(other: CallCredentials): CallCredentials {
    return new ComposedCallCredentials([this, other]);
  }

  _equals(other: CallCredentials): boolean {
    if (this === other) {
      return true;
    }
    if (other instanceof SingleCallCredentials) {
      return this.metadataGenerator === other.metadataGenerator;
    } else {
      return false;
    }
  }
}

class EmptyCallCredentials extends CallCredentials {
  generateMetadata(options: CallMetadataOptions): Promise<Metadata> {
    return Promise.resolve(new Metadata());
  }

  compose(other: CallCredentials): CallCredentials {
    return other;
  }

  _equals(other: CallCredentials): boolean {
    return other instanceof EmptyCallCredentials;
  }
}
