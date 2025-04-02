export type BackendExtensionContext = {};

export type BackendExtensionSetupFn = (context: BackendExtension) => void;

export type BackendExtension = {
	setup: BackendExtensionSetupFn;
};
