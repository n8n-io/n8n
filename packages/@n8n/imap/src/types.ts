import type { Config, ImapMessageBodyInfo, ImapMessageAttributes } from 'imap';

export interface ImapSimpleOptions {
	/** Options to pass to node-imap constructor. */
	imap: Config;

	/** Server event emitted when new mail arrives in the currently open mailbox. */
	onMail?: ((numNewMail: number) => void) | undefined;

	/** Server event emitted when a message was expunged externally. seqNo is the sequence number (instead of the unique UID) of the message that was expunged. If you are caching sequence numbers, all sequence numbers higher than this value MUST be decremented by 1 in order to stay synchronized with the server and to keep correct continuity. */
	onExpunge?: ((seqNo: number) => void) | undefined;

	/** Server event emitted when message metadata (e.g. flags) changes externally. */
	onUpdate?:
		| ((seqNo: number, info: { num: number | undefined; text: unknown }) => void)
		| undefined;
}

export interface MessagePart {
	partID: string;
	encoding: 'BASE64' | 'QUOTED-PRINTABLE' | '7BIT' | '8BIT' | 'BINARY' | 'UUENCODE';
	type: 'TEXT';
	subtype: string;
	params?: {
		charset?: string;
	};
	disposition?: {
		type: string;
	};
}

export interface MessageBodyPart extends ImapMessageBodyInfo {
	/** string type where which=='TEXT', complex Object where which=='HEADER' */
	body: string | object;
}

export interface Message {
	attributes: ImapMessageAttributes;
	parts: MessageBodyPart[];
	seqNo?: number;
}

export type SearchCriteria = string | [string, string];
