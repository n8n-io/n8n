export type BackEndModuleContext = {};

export type BackEndModuleSetupFn = (context: BackEndModule) => void;

export type BackEndModule = {
	setup: BackEndModuleSetupFn;
};
