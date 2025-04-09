export type BackendExtensionContext = {
	example?: string;
};

export type BackendExtensionSetupFn = (context: BackendExtension) => void;

export type BackendExtension = {
	setup: BackendExtensionSetupFn;
};
