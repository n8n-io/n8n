/*
 * Copyright 2022 gRPC authors.
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

import { CallCredentials } from './call-credentials';
import {
  Call,
  DeadlineInfoProvider,
  InterceptingListener,
  MessageContext,
  StatusObject,
} from './call-interface';
import { SubchannelCall } from './subchannel-call';
import { ConnectivityState } from './connectivity-state';
import { LogVerbosity, Status } from './constants';
import { Deadline, formatDateDifference, getDeadlineTimeoutString } from './deadline';
import { InternalChannel } from './internal-channel';
import { Metadata } from './metadata';
import { PickResultType } from './picker';
import { CallConfig } from './resolver';
import { splitHostPort } from './uri-parser';
import * as logging from './logging';
import { restrictControlPlaneStatusCode } from './control-plane-status';
import * as http2 from 'http2';

const TRACER_NAME = 'load_balancing_call';

export type RpcProgress = 'NOT_STARTED' | 'DROP' | 'REFUSED' | 'PROCESSED';

export interface StatusObjectWithProgress extends StatusObject {
  progress: RpcProgress;
}

export interface LoadBalancingCallInterceptingListener
  extends InterceptingListener {
  onReceiveStatus(status: StatusObjectWithProgress): void;
}

export class LoadBalancingCall implements Call, DeadlineInfoProvider {
  private child: SubchannelCall | null = null;
  private readPending = false;
  private pendingMessage: { context: MessageContext; message: Buffer } | null =
    null;
  private pendingHalfClose = false;
  private ended = false;
  private serviceUrl: string;
  private metadata: Metadata | null = null;
  private listener: InterceptingListener | null = null;
  private onCallEnded: ((statusCode: Status) => void) | null = null;
  private startTime: Date;
  private childStartTime: Date | null = null;
  constructor(
    private readonly channel: InternalChannel,
    private readonly callConfig: CallConfig,
    private readonly methodName: string,
    private readonly host: string,
    private readonly credentials: CallCredentials,
    private readonly deadline: Deadline,
    private readonly callNumber: number
  ) {
    const splitPath: string[] = this.methodName.split('/');
    let serviceName = '';
    /* The standard path format is "/{serviceName}/{methodName}", so if we split
     * by '/', the first item should be empty and the second should be the
     * service name */
    if (splitPath.length >= 2) {
      serviceName = splitPath[1];
    }
    const hostname = splitHostPort(this.host)?.host ?? 'localhost';
    /* Currently, call credentials are only allowed on HTTPS connections, so we
     * can assume that the scheme is "https" */
    this.serviceUrl = `https://${hostname}/${serviceName}`;
    this.startTime = new Date();
  }
  getDeadlineInfo(): string[] {
    const deadlineInfo: string[] = [];
    if (this.childStartTime) {
      if (this.childStartTime > this.startTime) {
        if (this.metadata?.getOptions().waitForReady) {
          deadlineInfo.push('wait_for_ready');
        }
        deadlineInfo.push(`LB pick: ${formatDateDifference(this.startTime, this.childStartTime)}`);
      }
      deadlineInfo.push(...this.child!.getDeadlineInfo());
      return deadlineInfo;
    } else {
      if (this.metadata?.getOptions().waitForReady) {
        deadlineInfo.push('wait_for_ready');
      }
      deadlineInfo.push('Waiting for LB pick');
    }
    return deadlineInfo;
  }

  private trace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      TRACER_NAME,
      '[' + this.callNumber + '] ' + text
    );
  }

  private outputStatus(status: StatusObject, progress: RpcProgress) {
    if (!this.ended) {
      this.ended = true;
      this.trace(
        'ended with status: code=' +
          status.code +
          ' details="' +
          status.details +
          '" start time=' +
          this.startTime.toISOString()
      );
      const finalStatus = { ...status, progress };
      this.listener?.onReceiveStatus(finalStatus);
      this.onCallEnded?.(finalStatus.code);
    }
  }

  doPick() {
    if (this.ended) {
      return;
    }
    if (!this.metadata) {
      throw new Error('doPick called before start');
    }
    this.trace('Pick called');
    const finalMetadata = this.metadata.clone();
    const pickResult = this.channel.doPick(
      finalMetadata,
      this.callConfig.pickInformation
    );
    const subchannelString = pickResult.subchannel
      ? '(' +
        pickResult.subchannel.getChannelzRef().id +
        ') ' +
        pickResult.subchannel.getAddress()
      : '' + pickResult.subchannel;
    this.trace(
      'Pick result: ' +
        PickResultType[pickResult.pickResultType] +
        ' subchannel: ' +
        subchannelString +
        ' status: ' +
        pickResult.status?.code +
        ' ' +
        pickResult.status?.details
    );
    switch (pickResult.pickResultType) {
      case PickResultType.COMPLETE:
        const combinedCallCredentials = this.credentials.compose(pickResult.subchannel!.getCallCredentials());
        combinedCallCredentials
          .generateMetadata({ method_name: this.methodName, service_url: this.serviceUrl })
          .then(
            credsMetadata => {
              /* If this call was cancelled (e.g. by the deadline) before
               * metadata generation finished, we shouldn't do anything with
               * it. */
              if (this.ended) {
                this.trace(
                  'Credentials metadata generation finished after call ended'
                );
                return;
              }
              finalMetadata.merge(credsMetadata);
              if (finalMetadata.get('authorization').length > 1) {
                this.outputStatus(
                  {
                    code: Status.INTERNAL,
                    details:
                      '"authorization" metadata cannot have multiple values',
                    metadata: new Metadata(),
                  },
                  'PROCESSED'
                );
              }
              if (
                pickResult.subchannel!.getConnectivityState() !==
                ConnectivityState.READY
              ) {
                this.trace(
                  'Picked subchannel ' +
                    subchannelString +
                    ' has state ' +
                    ConnectivityState[
                      pickResult.subchannel!.getConnectivityState()
                    ] +
                    ' after getting credentials metadata. Retrying pick'
                );
                this.doPick();
                return;
              }

              if (this.deadline !== Infinity) {
                finalMetadata.set(
                  'grpc-timeout',
                  getDeadlineTimeoutString(this.deadline)
                );
              }
              try {
                this.child = pickResult
                  .subchannel!.getRealSubchannel()
                  .createCall(finalMetadata, this.host, this.methodName, {
                    onReceiveMetadata: metadata => {
                      this.trace('Received metadata');
                      this.listener!.onReceiveMetadata(metadata);
                    },
                    onReceiveMessage: message => {
                      this.trace('Received message');
                      this.listener!.onReceiveMessage(message);
                    },
                    onReceiveStatus: status => {
                      this.trace('Received status');
                      if (
                        status.rstCode ===
                        http2.constants.NGHTTP2_REFUSED_STREAM
                      ) {
                        this.outputStatus(status, 'REFUSED');
                      } else {
                        this.outputStatus(status, 'PROCESSED');
                      }
                    },
                  });
                this.childStartTime = new Date();
              } catch (error) {
                this.trace(
                  'Failed to start call on picked subchannel ' +
                    subchannelString +
                    ' with error ' +
                    (error as Error).message
                );
                this.outputStatus(
                  {
                    code: Status.INTERNAL,
                    details:
                      'Failed to start HTTP/2 stream with error ' +
                      (error as Error).message,
                    metadata: new Metadata(),
                  },
                  'NOT_STARTED'
                );
                return;
              }
              pickResult.onCallStarted?.();
              this.onCallEnded = pickResult.onCallEnded;
              this.trace(
                'Created child call [' + this.child.getCallNumber() + ']'
              );
              if (this.readPending) {
                this.child.startRead();
              }
              if (this.pendingMessage) {
                this.child.sendMessageWithContext(
                  this.pendingMessage.context,
                  this.pendingMessage.message
                );
              }
              if (this.pendingHalfClose) {
                this.child.halfClose();
              }
            },
            (error: Error & { code: number }) => {
              // We assume the error code isn't 0 (Status.OK)
              const { code, details } = restrictControlPlaneStatusCode(
                typeof error.code === 'number' ? error.code : Status.UNKNOWN,
                `Getting metadata from plugin failed with error: ${error.message}`
              );
              this.outputStatus(
                {
                  code: code,
                  details: details,
                  metadata: new Metadata(),
                },
                'PROCESSED'
              );
            }
          );
        break;
      case PickResultType.DROP:
        const { code, details } = restrictControlPlaneStatusCode(
          pickResult.status!.code,
          pickResult.status!.details
        );
        setImmediate(() => {
          this.outputStatus(
            { code, details, metadata: pickResult.status!.metadata },
            'DROP'
          );
        });
        break;
      case PickResultType.TRANSIENT_FAILURE:
        if (this.metadata.getOptions().waitForReady) {
          this.channel.queueCallForPick(this);
        } else {
          const { code, details } = restrictControlPlaneStatusCode(
            pickResult.status!.code,
            pickResult.status!.details
          );
          setImmediate(() => {
            this.outputStatus(
              { code, details, metadata: pickResult.status!.metadata },
              'PROCESSED'
            );
          });
        }
        break;
      case PickResultType.QUEUE:
        this.channel.queueCallForPick(this);
    }
  }

  cancelWithStatus(status: Status, details: string): void {
    this.trace(
      'cancelWithStatus code: ' + status + ' details: "' + details + '"'
    );
    this.child?.cancelWithStatus(status, details);
    this.outputStatus(
      { code: status, details: details, metadata: new Metadata() },
      'PROCESSED'
    );
  }
  getPeer(): string {
    return this.child?.getPeer() ?? this.channel.getTarget();
  }
  start(
    metadata: Metadata,
    listener: LoadBalancingCallInterceptingListener
  ): void {
    this.trace('start called');
    this.listener = listener;
    this.metadata = metadata;
    this.doPick();
  }
  sendMessageWithContext(context: MessageContext, message: Buffer): void {
    this.trace('write() called with message of length ' + message.length);
    if (this.child) {
      this.child.sendMessageWithContext(context, message);
    } else {
      this.pendingMessage = { context, message };
    }
  }
  startRead(): void {
    this.trace('startRead called');
    if (this.child) {
      this.child.startRead();
    } else {
      this.readPending = true;
    }
  }
  halfClose(): void {
    this.trace('halfClose called');
    if (this.child) {
      this.child.halfClose();
    } else {
      this.pendingHalfClose = true;
    }
  }
  setCredentials(credentials: CallCredentials): void {
    throw new Error('Method not implemented.');
  }

  getCallNumber(): number {
    return this.callNumber;
  }
}
