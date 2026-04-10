export type ProxyAuthType = 'basic' | 'digest' | 'ntlm' | 'negotiate' | 'none';

export type AuthType = ProxyAuthType | 'ntlm-wb' | 'bearer' | 'aws-sigv4';

export type CurlToJsonResult = {
	url: string;
	raw_url: string;
	method: string;
	cookies?: {
		[key: string]: string;
	};
	headers?: {
		[key: string]: string | null;
	};
	queries?: {
		[key: string]: string | string[];
	};
	data?:
		| string
		| {
				[key: string]: string | boolean;
		  };
	files?: {
		[key: string]: string;
	};
	insecure?: boolean;
	compressed?: boolean;
	include?: boolean;
	auth?: {
		user: string;
		password: string;
	};
	auth_type?: AuthType;
	aws_sigv4?: string;
	delegation?: string;
	follow_redirects?: boolean;
	max_redirects?: number;
	proxy?: string;
	timeout?: number;
	connect_timeout?: number;
	output?: string;
};

export interface ParsedCurlYargs {
	_: string | string[];
	url?: string;
	G?: boolean;
	get?: boolean;
	X?: string;
	request?: string;
	d?: string | string[];
	data?: string | string[];
	'data-raw'?: string | string[];
	dataRaw?: string | string[];
	'data-binary'?: string | string[];
	dataBinary?: string | string[];
	'data-urlencode'?: string | string[];
	dataUrlencode?: string | string[];
	F?: string | string[];
	form?: string | string[];
	H?: string | string[];
	header?: string | string[];
	u?: string;
	user?: string;
	basic?: boolean;
	digest?: boolean;
	ntlm?: boolean;
	negotiate?: boolean;
	'ntlm-wb'?: boolean;
	ntlmWb?: boolean;
	awsSigv4?: string;
	'aws-sigv4'?: string;
	'oauth2-bearer'?: string;
	oauth2Bearer?: string;
	L?: boolean;
	location?: boolean;
	'max-redirs'?: number;
	maxRedirs?: number;
	'connect-timeout'?: number;
	connectTimeout?: number;
	k?: boolean;
	insecure?: boolean;
	i?: boolean;
	include?: boolean;
	x?: string;
	proxy?: string;
	o?: string;
	output?: string;
}
