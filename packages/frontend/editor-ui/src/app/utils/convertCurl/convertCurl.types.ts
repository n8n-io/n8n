export type ProxyAuthType = "basic" | "digest" | "ntlm" | "negotiate" | "none";

export type AuthType = ProxyAuthType | "ntlm-wb" | "bearer" | "aws-sigv4";

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
    data?: {
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
