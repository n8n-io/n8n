export interface Async3Definition {
    asyncapi: string;
    servers?: Record<string, any>;
    info: Async3Info;
    channels?: Record<string, Channel>;
    components?: Record<string, any>;
    operations?: Record<string, any>;
    defaultContentType?: string;
}
export interface Async3Info {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: Async3Contact;
    license?: Async3License;
    tags?: Tag[];
    externalDocs?: ExternalDoc;
}
export interface Async3Contact {
    name?: string;
    url?: string;
    email?: string;
}
export interface Async3License {
    name: string;
    url?: string;
}
export interface Tag {
    name: string;
    description?: string;
    externalDocs?: ExternalDoc;
}
export interface ExternalDoc {
    url: string;
    description?: string;
}
export interface Channel {
    address?: string | null;
    messages?: Record<string, any>;
    title?: string;
    summary?: string;
    description?: string;
    servers?: Record<string, any>[];
    parameters?: Record<string, any>;
    tags?: Record<string, any>;
    externalDocs?: ExternalDocumentation;
    bindings?: Record<string, any>;
}
export interface ExternalDocumentation {
    url: string;
    description?: string;
}
