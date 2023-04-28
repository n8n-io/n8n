declare module '@deep-consulting-solutions/swagger-editor' {
	export interface Editor {
		jsonSchemaValidatorActions: {
			terminateWorker: Function;
		};
	}

	export default function SwaggerEditor(options: Record<string, any | undefined>): Editor;
}
