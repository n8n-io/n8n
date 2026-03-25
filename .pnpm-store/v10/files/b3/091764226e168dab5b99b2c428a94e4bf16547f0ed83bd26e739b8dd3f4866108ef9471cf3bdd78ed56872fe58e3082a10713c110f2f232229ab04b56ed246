/// <reference types="handlebars" />

export interface UnknownObject {
	[index: string]: unknown
}

export interface HelperDelegateObject {
	[index: string]: Handlebars.HelperDelegate;
}

export interface TemplateDelegateObject {
	[index: string]: Handlebars.TemplateDelegate;
}

export interface TemplateSpecificationObject {
	[index: string]: TemplateSpecification;
}

export interface CompiledCache {
	[index: string]: Promise<Handlebars.TemplateDelegate>;
}

export interface PrecompiledCache {
	[index: string]: Promise<TemplateSpecification>;
}

export interface FsCache {
	[index: string]: string|string[]|Promise<string|string[]>;
}

export type RenameFunction = (filePath: string, namespace?: string) => string

export interface PartialsDirObject {
	templates: TemplateDelegateObject;
	namespace: string;
	dir: string;
	rename?: RenameFunction | undefined;
}

export interface PartialTemplateOptions {
	encoding?: BufferEncoding;
	cache?: boolean;
	precompiled?: boolean;
}

export interface RenderOptions {
	cache?: boolean;
	data?: UnknownObject;
	encoding?: BufferEncoding;
	helpers?: HelperDelegateObject;
	layout?: string;
	partials?: TemplateDelegateObject;
	runtimeOptions?: Handlebars.RuntimeOptions;
}

export interface RenderViewOptions extends RenderOptions {
	[index: string]: unknown;
	settings?: {
		views: string|string[]
	}
}

export type HandlebarsCompile = (input: unknown, options: CompileOptions) => Handlebars.TemplateDelegate;
export type HandlebarsPrecompile = (input: unknown, options: PrecompileOptions) => TemplateSpecification;

export interface HandlebarsImport {
	[index: string]: unknown;
	compile: HandlebarsCompile;
	precompile: HandlebarsPrecompile;
}

export interface ConfigOptions {
	handlebars?: HandlebarsImport;
	extname?: string;
	encoding?: BufferEncoding;
	layoutsDir?: string;
	partialsDir?: string|string[]|PartialsDirObject|PartialsDirObject[];
	defaultLayout?: string|false;
	helpers?: UnknownObject;
	compilerOptions?: CompileOptions;
	runtimeOptions?: Handlebars.RuntimeOptions;
}

export interface EngineOptions extends ConfigOptions {
	[index: string]: unknown;
}

export interface RenderCallback {
		(err: Error|null, content?: string): void;
}

export type Engine = (viewPath: string, options: ConfigOptions, callback?: RenderCallback) => Promise<string>
