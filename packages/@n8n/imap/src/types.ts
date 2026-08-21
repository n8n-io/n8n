import type { ImapMessageBodyInfo, ImapMessageAttributes } from 'imap';

export interface MessagePart {
	partID: string;
	encoding: 'BASE64' | 'QUOTED-PRINTABLE' | '7BIT' | '8BIT' | 'BINARY' | 'UUENCODE' | null;
	type: 'TEXT';
	subtype: string;
	params?: {
		charset?: string;
	};
	disposition?: {
		type: string;
		params?: {
			filename?: string;
		};
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
