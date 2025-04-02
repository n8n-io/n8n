export type BackendModuleContext = {};

export type BackendModuleSetupFn = (context: BackendModule) => void;

export type BackendModule = {
	setup: BackendModuleSetupFn;
};
