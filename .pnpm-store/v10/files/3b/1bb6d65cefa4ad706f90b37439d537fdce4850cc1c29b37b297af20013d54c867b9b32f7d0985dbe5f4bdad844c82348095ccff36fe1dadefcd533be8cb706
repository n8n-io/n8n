/// <reference types="node" />

import { EventEmitter } from "node:events";

import { Transport, TransportOptions } from "../..";

import * as shared from "../shared";

import Mail = require("../mailer");
import MailMessage = require("../mailer/mail-message");
import MimeNode = require("../mime-node");

declare namespace SESTransport {
    /**
     * Minimal structural shape of SESv2 SendEmail input.
     * This is intentionally structural so @types/nodemailer does not require
     * installing @aws-sdk/client-sesv2.
     *
     * If you want the full, exact type, install @aws-sdk/client-sesv2 in your
     * app and use its types directly in your own code.
     */
    interface SendEmailRequestLike {
        FromEmailAddress?: string;
        Destination?: {
            ToAddresses?: string[];
            CcAddresses?: string[];
            BccAddresses?: string[];
        };
        ReplyToAddresses?: string[];
        Content?: unknown;
        EmailTags?: Array<{ Name?: string; Value?: string }>;
        ConfigurationSetName?: string;
        ListManagementOptions?: unknown;
        FeedbackForwardingEmailAddress?: string;
        // Allow extra fields without forcing the SDK type package
        [key: string]: unknown;
    }

    /** Structural type matching SESv2Client from @aws-sdk/client-sesv2 */
    interface SESv2ClientLike {
        send(command: unknown, options?: unknown): Promise<{ MessageId?: string }>;
        config?: {
            region?: string | (() => Promise<string>);
        };
    }

    /**
     * Constructor type for SendEmailCommand from @aws-sdk/client-sesv2.
     * The real type is: new(input: SendEmailCommandInput) => SendEmailCommand
     * Contravariance prevents typing this more strictly without pulling in aws-sdk as a dependency.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type SendEmailCommandConstructorLike = new(input: any) => unknown;

    interface MailOptions extends Mail.Options {
        /** Options passed to AWS SESv2 SendEmailCommand */
        ses?: MailSesOptions | undefined;
    }

    // Keep it as an interface for backward-compatibility
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    interface MailSesOptions extends Partial<SendEmailRequestLike> {}

    interface Options extends MailOptions, TransportOptions {
        /** An object containing an instantiated SESv2Client and the SendEmailCommand class */
        SES: {
            sesClient: SESv2ClientLike;
            SendEmailCommand: SendEmailCommandConstructorLike;
        };
    }

    interface SentMessageInfo {
        /** an envelope object {from:'address', to:['address']} */
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
