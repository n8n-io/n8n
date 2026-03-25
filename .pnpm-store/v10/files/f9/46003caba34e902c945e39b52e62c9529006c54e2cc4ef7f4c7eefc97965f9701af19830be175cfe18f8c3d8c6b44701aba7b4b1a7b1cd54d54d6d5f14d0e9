/// <reference types="node" />

import * as aws from "@aws-sdk/client-sesv2";
import { EventEmitter } from "node:events";

import { Transport, TransportOptions } from "../..";

import * as shared from "../shared";

import Mail = require("../mailer");
import MailMessage = require("../mailer/mail-message");
import MimeNode = require("../mime-node");

declare namespace SESTransport {
    interface MailOptions extends Mail.Options {
        /** list of keys that SendRawEmail method can take */
        ses?: MailSesOptions | undefined;
    }

    // Keep it as an interface for backward-compatibility
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface MailSesOptions extends Partial<aws.SendEmailRequest> {}

    interface Options extends MailOptions, TransportOptions {
        /** is an option that expects an instantiated aws.SES object */
        SES: {
            sesClient: aws.SESv2Client;
            SendEmailCommand: typeof aws.SendEmailCommand;
        };
    }

    interface SentMessageInfo {
        /** an envelope object {from:‘address’, to:[‘address’]} */
        envelope: MimeNode.Envelope;
        /** the Message-ID header value. This value is derived from the response of SES API, so it differs from the Message-ID values used in logging. */
        messageId: string;
        response: string;
        accepted: Array<string | Mail.Address>;
        rejected: Array<string | Mail.Address>;
        pending: Array<string | Mail.Address>;
        raw: Buffer;
    }
}

declare class SESTransport extends EventEmitter implements Transport<SESTransport.SentMessageInfo> {
    options: SESTransport.Options;

    logger: shared.Logger;
    mailer: Mail<SESTransport.SentMessageInfo>;

    name: string;
    version: string;

    ses: SESTransport.Options["SES"];

    constructor(options: SESTransport.Options);

    /** Undocumented */
    getRegion(
        callback: (err: Error | null, region: string | undefined) => void,
    ): void;

    /** Schedules a sending of a message */
    send(
        mail: MailMessage<SESTransport.SentMessageInfo>,
        callback: (err: Error | null, info: SESTransport.SentMessageInfo) => void,
    ): void;

    /** Verifies SES configuration */
    verify(callback: (err: Error | null, success: true) => void): void;
    verify(): Promise<true>;
}

export = SESTransport;
