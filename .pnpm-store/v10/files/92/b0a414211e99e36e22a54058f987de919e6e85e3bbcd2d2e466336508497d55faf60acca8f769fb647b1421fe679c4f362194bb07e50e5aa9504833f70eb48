/// <reference types="node" />

import StreamModule = require("stream");
import { DecoderStream } from "iconv-lite";
import Stream = StreamModule.Stream;

/**
 * Structured object for headers with arguments.
 *
 * `content-type: text/plain; CHARSET="UTF-8"` =>
 * ```
 * {
 *     "value": "text/plain",
 *     "params": {
 *         "charset": "UTF-8"
 *     }
 * }
 * ```
 */
export interface StructuredHeader {
    /**
     * The main value.
     */
    value: string;
    /**
     * Additional arguments.
     */
    params: { [key: string]: string };
}

/**
 * Possible types of a header value.
 */
export type HeaderValue = string | string[] | AddressObject | Date | StructuredHeader;

/**
 * A Map object with lowercase header keys.
 */
export type Headers = Map<string, HeaderValue>;
/**
 * An array of raw header lines
 */
export type HeaderLines = ReadonlyArray<{
    key: string;
    line: string;
}>;
/**
 * Address details.
 */
export interface EmailAddress {
    /**
     * The email address.
     */
    address?: string | undefined;
    /**
     * The name part of the email/group.
     */
    name: string;
    /**
     * An array of grouped addresses.
     */
    group?: EmailAddress[] | undefined;
}

/**
 * Address object.
 */
export interface AddressObject {
    /**
     * An array with address details.
     */
    value: EmailAddress[];
    /**
     * A formatted address string for HTML context.
     */
    html: string;
    /**
     * A formatted address string for plaintext context.
     */
    text: string;
}

/**
 * COmmon part of the Attachment object.
 */
export interface AttachmentCommon {
    /**
     * Message type.
     */
    type: "attachment";
    /**
     * Attachment contents.
     */
    content: any;
    /**
     * MIME type of the message.
     */
    contentType: string;
    /**
     * Content disposition type for the attachment,
     * most probably `'attachment'`.
     */
    contentDisposition: string;
    /**
     * File name of the attachment.
     */
    filename?: string | undefined;
    /**
     * A Map value that holds MIME headers for the attachment node.
     */
    headers: Headers;
    /**
     * An array of raw header lines for the attachment node.
     */
    headerLines: HeaderLines;
    /**
     * A MD5 hash of the message content.
     */
    checksum: string;
    /**
     * Message size in bytes.
     */
    size: number;
    /**
     * The header value from `Content-ID`.
     */
    contentId?: string | undefined;
    /**
     * `contentId` without `<` and `>`.
     */
    cid?: string | undefined; // e.g. '5.1321281380971@localhost'
    /**
     * If true then this attachment should not be offered for download
     * (at least not in the main attachments list).
     */
    related?: boolean | undefined;
}

/**
 * Attachment object.
 */
export interface Attachment extends AttachmentCommon {
    /**
     * A Buffer that contains the attachment contents.
     */
    content: Buffer;
    /**
     * If true then this attachment should not be offered for download
     * (at least not in the main attachments list).
     */
    related: boolean;
}

/**
 * MailParser Attachment object.
 */
export interface AttachmentStream extends AttachmentCommon {
    /**
     * A Buffer that contains the attachment contents.
     */
    content: Stream;
    /**
     * Method must be called once you have processed the attachment.
     */
    release(): void;
}

/**
 * Parsed mail object.
 */
export interface ParsedMail {
    /**
     * An array of attachments.
     */
    attachments: Attachment[];
    /**
     * A Map object with lowercase header keys.
     *
     * - All address headers are converted into address objects.
     * - `references` is a string if only a single reference-id exists or an
     *    array if multiple ids exist.
     * - `date` value is a Date object.
     */
    headers: Headers;
    /**
     * An array of raw header lines
     */
    headerLines: HeaderLines;
    /**
     * The HTML body of the message.
     *
     * Sets to `false` when there is no HTML body.
     *
     * If the message included embedded images as cid: urls then these are all
     * replaced with base64 formatted data: URIs.
     */
    html: string | false;
    /**
     * The plaintext body of the message.
     */
    text?: string | undefined;
    /**
     * The plaintext body of the message formatted as HTML.
     */
    textAsHtml?: string | undefined;
    /**
     * The subject line.
     */
    subject?: string | undefined;
    /**
     * Either an array of two or more referenced Message-ID values or a single Message-ID value.
     *
     * Not set if no reference values present.
     */
    references?: string[] | string | undefined;
    /**
     * A Date object for the `Date:` header.
     */
    date?: Date | undefined;
    /**
     * An address object or array of address objects for the `To:` header.
     */
    to?: AddressObject | AddressObject[] | undefined;
    /**
     * An address object for the `From:` header.
     */
    from?: AddressObject | undefined;
    /**
     * An address object or array of address objects for the `Cc:` header.
     */
    cc?: AddressObject | AddressObject[] | undefined;
    /**
     * An address object or array of address objects for the `Bcc:` header.
     * (usually not present)
     */
    bcc?: AddressObject | AddressObject[] | undefined;
    /**
     * An address object for the `Reply-To:` header.
     */
    replyTo?: AddressObject | undefined;
    /**
     * The Message-ID value string.
     */
    messageId?: string | undefined;
    /**
     * The In-Reply-To value string.
     */
    inReplyTo?: string | undefined;
    /**
     * Priority of the e-mail.
     */
    priority?: "normal" | "low" | "high" | undefined;
}

/**
 * Text message content.
 */
export interface MessageText {
    /**
     * Message type.
     */
    type: "text";
    /**
     * Includes the HTML version of the message.
     *
     * Is set if the message has at least one `text/html` node.
     */
    html?: string | boolean | undefined;
    /**
     * Includes the plaintext version of the message.
     *
     * Is set if the message has at least one `text/plain` node.
     */
    text?: string | undefined;
    /**
     * Includes the plaintext version of the message in HTML format.
     *
     * Is set if the message has at least one `text/plain` node.
     */
    textAsHtml?: string | undefined;
}

/**
 * A lower-level email parsing class.
 *
 * It is a transform stream that takes email source as bytestream for the input
 * and emits data objects for attachments and text contents.
 */
export class MailParser extends StreamModule.Transform {
    constructor(options?: MailParserOptions);
    on(event: string, callback: (any: any) => void): this;
    on(event: "headers", callback: (headers: Headers) => void): this;
    on(event: "data" | "readable", callback: (data: AttachmentStream | MessageText) => void): this;
}

/**
 * A message source.
 */
export type Source = Buffer | Stream | string;

/**
 * Options object for MailParser.
 */
export interface MailParserOptions extends StreamModule.TransformOptions {
    skipHtmlToText?: boolean | undefined;
    maxHtmlLengthToParse?: number | undefined;
    formatDateString?: ((d: Date) => string) | undefined;
    skipImageLinks?: boolean | undefined;
    skipTextToHtml?: boolean | undefined;
    skipTextLinks?: boolean | undefined;
    Iconv?: DecoderStream | undefined;
    keepCidLinks?: boolean | undefined;
}

/**
 * Options for SimpleParser.
 */
export type SimpleParserOptions = MailParserOptions;

/**
 * Parse email message to structure object.
 *
 * @param source A message source.
 * @param callback Function to get a structured email object.
 */
export function simpleParser(source: Source, callback: (err: any, mail: ParsedMail) => void): void;

/**
 * Parse email message to structure object.
 *
 * @param source A message source.
 * @param options Transform options passed to MailParser's constructor
 * @param callback Function to get a structured email object.
 */
export function simpleParser(
    source: Source,
    options: SimpleParserOptions,
    callback: (err: any, mail: ParsedMail) => void,
): void;

/**
 * Parse email message to structure object.
 *
 * @param source A message source.
 * @param options Transform options passed to MailParser's constructor
 */
export function simpleParser(source: Source, options?: SimpleParserOptions): Promise<ParsedMail>;
