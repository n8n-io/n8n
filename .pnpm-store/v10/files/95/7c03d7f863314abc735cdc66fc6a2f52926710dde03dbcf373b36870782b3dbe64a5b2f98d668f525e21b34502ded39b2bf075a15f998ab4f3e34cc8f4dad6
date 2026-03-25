import { LoginResponseTemplate } from './libsaml';

export { IdentityProvider as IdentityProviderConstructor } from './entity-idp';
export { IdpMetadata as IdentityProviderMetadata } from './metadata-idp';

export { ServiceProvider as ServiceProviderConstructor } from './entity-sp';
export { SpMetadata as ServiceProviderMetadata } from './metadata-sp';

export type MetadataFile = string | Buffer;

type SSOService = {
  isDefault?: boolean;
  Binding: string;
  Location: string;
};

export interface MetadataIdpOptions {
  entityID?: string;
  signingCert?: string | Buffer | (string | Buffer)[];
  encryptCert?: string | Buffer | (string | Buffer)[];
  wantAuthnRequestsSigned?: boolean;
  nameIDFormat?: string[];
  singleSignOnService?: SSOService[];
  singleLogoutService?: SSOService[];
  requestSignatureAlgorithm?: string;
}

export type MetadataIdpConstructor =
  | MetadataIdpOptions
  | MetadataFile;

export interface MetadataSpOptions {
  entityID?: string;
  signingCert?: string | Buffer | (string | Buffer)[];
  encryptCert?: string | Buffer | (string | Buffer)[];
  authnRequestsSigned?: boolean;
  wantAssertionsSigned?: boolean;
  wantMessageSigned?: boolean;
  signatureConfig?: { [key: string]: any };
  nameIDFormat?: string[];
  singleSignOnService?: SSOService[];
  singleLogoutService?: SSOService[];
  assertionConsumerService?: SSOService[];
  elementsOrder?: string[];
}

export type MetadataSpConstructor =
  | MetadataSpOptions
  | MetadataFile;

export type EntitySetting = ServiceProviderSettings & IdentityProviderSettings;

export interface SignatureConfig {
  prefix?: string;
  location?: {
    reference?: string;
    action?: 'append' | 'prepend' | 'before' | 'after';
  };
}

export interface SAMLDocumentTemplate {
  context?: string;
}

export type ServiceProviderSettings = {
  metadata?: string | Buffer;
  entityID?: string;
  authnRequestsSigned?: boolean;
  wantAssertionsSigned?: boolean;
  wantMessageSigned?: boolean;
  wantLogoutResponseSigned?: boolean;
  wantLogoutRequestSigned?: boolean;
  privateKey?: string | Buffer;
  privateKeyPass?: string;
  isAssertionEncrypted?: boolean;
  requestSignatureAlgorithm?: string;
  encPrivateKey?: string | Buffer;
  encPrivateKeyPass?: string | Buffer;
  assertionConsumerService?: SSOService[];
  singleLogoutService?: SSOService[];
  signatureConfig?: SignatureConfig;
  loginRequestTemplate?: SAMLDocumentTemplate;
  logoutRequestTemplate?: SAMLDocumentTemplate;
  signingCert?: string | Buffer | (string | Buffer)[];
  encryptCert?: string | Buffer | (string | Buffer)[];
  transformationAlgorithms?: string[];
  nameIDFormat?: string[];
  allowCreate?: boolean;
  // will be deprecated soon
  relayState?: string;
  // https://github.com/tngan/samlify/issues/337
  clockDrifts?: [number, number];
};

export type IdentityProviderSettings = {
  metadata?: string | Buffer;

  /** signature algorithm */
  requestSignatureAlgorithm?: string;

  /** template of login response */
  loginResponseTemplate?: LoginResponseTemplate;

  /** template of logout request */
  logoutRequestTemplate?: SAMLDocumentTemplate;

  /** customized function used for generating request ID */
  generateID?: () => string;

  entityID?: string;
  privateKey?: string | Buffer;
  privateKeyPass?: string;
  signingCert?: string | Buffer | (string | Buffer)[];
  encryptCert?: string | Buffer | (string | Buffer)[];
  nameIDFormat?: string[];
  singleSignOnService?: SSOService[];
  singleLogoutService?: SSOService[];
  isAssertionEncrypted?: boolean;
  encPrivateKey?: string | Buffer;
  encPrivateKeyPass?: string;
  messageSigningOrder?: string;
  wantLogoutRequestSigned?: boolean;
  wantLogoutResponseSigned?: boolean;
  wantAuthnRequestsSigned?: boolean;
  wantLogoutRequestSignedResponseSigned?: boolean;
  tagPrefix?: { [key: string]: string };
};
