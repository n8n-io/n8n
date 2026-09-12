/* eslint-disable @typescript-eslint/naming-convention -- keys are wire header names */
import { parseHeaders } from './headers';

type Case = [name: string, raw: string, expected: Record<string, string[]>];

const cases: Case[] = [
	[
		'plain',
		'From: alice@example.com\nTo: bob@example.com\nSubject: Hello world\n',
		{ from: ['alice@example.com'], to: ['bob@example.com'], subject: ['Hello world'] },
	],
	[
		'no trailing newline',
		'From: alice@example.com\nSubject: Hi',
		{ from: ['alice@example.com'], subject: ['Hi'] },
	],
	[
		'stops at blank line',
		'From: a@b.c\nSubject: Test\n\nBody: not a header\n',
		{ from: ['a@b.c'], subject: ['Test'] },
	],
	[
		'repeated',
		'Received: from a\nReceived: from b\nReceived: from c\nSubject: x\n',
		{ received: ['from a', 'from b', 'from c'], subject: ['x'] },
	],
	[
		'folded space',
		'Subject: this is a very long\n subject line that folds\nFrom: a@b.c\n',
		{ subject: ['this is a very long subject line that folds'], from: ['a@b.c'] },
	],
	[
		'folded multiline',
		'Received: from mx.example.com (mx.example.com [1.2.3.4])\n by in.example.org with ESMTP id abc123\n for <bob@example.com>; Mon, 1 Jan 2024 00:00:00 +0000\n',
		{
			received: [
				'from mx.example.com (mx.example.com [1.2.3.4]) by in.example.org with ESMTP id abc123 for <bob@example.com>; Mon, 1 Jan 2024 00:00:00 +0000',
			],
		},
	],
	[
		'mixed case',
		'FROM: a@b.c\nSuBjEcT: Mixed\nX-Custom-Header: v\n',
		{ from: ['a@b.c'], subject: ['Mixed'], 'x-custom-header': ['v'] },
	],
	['key trailing space', 'Subject : spaced key\n', { subject: ['spaced key'] }],
	['empty value', 'Subject:\nFrom: a@b.c\n', { subject: [''], from: ['a@b.c'] }],
	['empty value trailing space', 'Subject: \nFrom: a@b.c\n', { subject: [''], from: ['a@b.c'] }],
	['tab after colon', 'Subject:\tvalue\n', { subject: ['value'] }],
	['no space after colon', 'Subject:value\n', { subject: ['value'] }],
	[
		'blank line terminates the block',
		'From: a@b.c\nSubject: kept\n\nSubject: after the blank line\ngarbage line without colon\n',
		{ from: ['a@b.c'], subject: ['kept'] },
	],
	['q encoded', 'Subject: =?utf-8?Q?Hello_World?=\n', { subject: ['Hello World'] }],
	['q encoded latin1', 'Subject: =?iso-8859-1?Q?Caf=E9_time?=\n', { subject: ['Café time'] }],
	['b encoded', 'Subject: =?utf-8?B?SGVsbG8gV29ybGQ=?=\n', { subject: ['Hello World'] }],
	['q split multibyte', 'Subject: =?utf-8?Q?=E1=9C?= =?utf-8?Q?=B0?=\n', { subject: ['ᜰ'] }],
	[
		'encoded word folded',
		'Subject: =?utf-8?Q?Hello_?=\n =?utf-8?Q?World?=\n',
		{ subject: ['Hello World'] },
	],
	[
		'encoded word with surrounding text',
		'Subject: Re: =?utf-8?Q?Caf=C3=A9?= meeting notes\n',
		{ subject: ['Re: Café meeting notes'] },
	],
	['encoded word language tag', 'Subject: =?utf-8*en?Q?Hello?=\n', { subject: ['Hello'] }],
	['unknown charset', 'Subject: =?x-unknown-charset?Q?Hello?=\n', { subject: ['Hello'] }],
	[
		'encoded display name',
		'From: =?utf-8?B?SsO2cmc=?= <joerg@example.com>\n',
		{ from: ['Jörg <joerg@example.com>'] },
	],
	['raw utf8 bytes', 'Subject: Café naïve\n', { subject: ['Café naïve'] }],
	[
		'rfc2047 two charsets',
		'Subject: =?ISO-8859-1?B?SWYgeW91IGNhbiByZWFkIHRoaXMgeW8=?=\n =?ISO-8859-2?B?dSB1bmRlcnN0YW5kIHRoZSBleGFtcGxlLg==?=\n',
		{ subject: ['If you can read this you understand the example.'] },
	],
	['empty', '', {}],
	['blank line only', '\n', {}],
	['orphan continuation', ' orphan continuation\nFrom: a@b.c\n', { '': [''], from: ['a@b.c'] }],
	['folded tab', 'Subject: first part\n\tsecond part\n', { subject: ['first part second part'] }],
	[
		'folded run of spaces',
		'Subject: first part\n    second part\n',
		{ subject: ['first part second part'] },
	],
	['leading space after colon', 'Subject:  leading space\n', { subject: ['leading space'] }],
	['duplicate then empty', 'X-A: one\nX-A:\nX-A: three\n', { 'x-a': ['one', '', 'three'] }],
	[
		'b split four ways',
		'Subject: =?utf-8?B?8A==?= =?utf-8?B?nw==?= =?utf-8?B?kQ==?= =?utf-8?B?iw==?=\n',
		{ subject: ['👋'] },
	],
	['iso-8859-8-i', 'Subject: =?iso-8859-8-i?Q?=E0=E1?=\n', { subject: ['אב'] }],
	['quoted charset', 'Subject: =?"utf-8"?Q?abc?=\n', { subject: ['=?"utf-8"?Q?abc?='] }],
	[
		'no colon line mid-block',
		'From: a@b.c\ngarbage line without colon\nSubject: kept\n',
		{ from: ['a@b.c'], '': [''], subject: ['kept'] },
	],
	[
		'no colon line first',
		'garbage line without colon\nFrom: a@b.c\nSubject: kept\n',
		{ '': [''], from: ['a@b.c'], subject: ['kept'] },
	],
	[
		'continuation after no colon line',
		'Subject: foo\ngarbage line without colon\n bar\nFrom: a@b.c\n',
		{ subject: ['foo'], '': [''], from: ['a@b.c'] },
	],
	[
		'realistic',
		'Delivered-To: bob@example.com\nReceived: by 2002:a05:6402 with SMTP id x;\n        Mon, 01 Jan 2024 00:00:00 -0800 (PST)\nMIME-Version: 1.0\nFrom: =?UTF-8?Q?Alice_M=C3=BCller?= <alice@example.com>\nDate: Mon, 1 Jan 2024 09:00:00 +0100\nMessage-ID: <CAB=123@mail.example.com>\nSubject: =?UTF-8?B?w5xiZXJyYXNjaHVuZyE=?=\nTo: Bob <bob@example.com>\nContent-Type: multipart/alternative; boundary="000000000000abcdef"\n\n--000000000000abcdef\n',
		{
			'delivered-to': ['bob@example.com'],
			received: ['by 2002:a05:6402 with SMTP id x; Mon, 01 Jan 2024 00:00:00 -0800 (PST)'],
			'mime-version': ['1.0'],
			from: ['Alice Müller <alice@example.com>'],
			date: ['Mon, 1 Jan 2024 09:00:00 +0100'],
			'message-id': ['<CAB=123@mail.example.com>'],
			subject: ['Überraschung!'],
			to: ['Bob <bob@example.com>'],
			'content-type': ['multipart/alternative; boundary="000000000000abcdef"'],
		},
	],
];

describe('parseHeaders', () => {
	test.each(cases)('%s', (_name, raw, expected) => {
		expect(parseHeaders(raw.replace(/\n/g, '\r\n'))).toEqual(expected);
	});

	it('splits on a bare LF', () => {
		expect(
			parseHeaders('Subject: this is a very long\n subject line that folds\nFrom: a@b.c\n'),
		).toEqual({ subject: ['this is a very long subject line that folds'], from: ['a@b.c'] });
	});

	test.each([
		'\r\n',
		':\r\n',
		': value\r\n',
		'Subject\r\n',
		'Subject: =?\r\n',
		'Subject: =?utf-8?B?\r\n',
		'Subject: =?utf-8?X?abc?=\r\n',
		'\t\r\n \r\n',
		'\0\r\nFrom: a@b.c\r\n',
	])('does not throw on malformed input %j', (raw) => {
		expect(() => parseHeaders(raw)).not.toThrow();
	});

	it('decodes a Buffer as UTF-8', () => {
		expect(parseHeaders(Buffer.from('Subject: =?utf-8?Q?Caf=C3=A9?= naïve\r\n', 'utf8'))).toEqual({
			subject: ['Café naïve'],
		});
	});
});
