import { ParameterInputIconModule } from './parameter-input-icon.module';

describe('ParameterInputIconModule', () => {
	it('claims the icon parameter type', () => {
		expect(ParameterInputIconModule.parameterInputs).toHaveLength(1);
		expect(ParameterInputIconModule.parameterInputs?.[0].type).toBe('icon');
	});

	// The shell owns expression rendering, the from-AI override and the drop target for
	// this type. Declaring any flag here would change behaviour the built-in branch had.
	it('declares no capabilities', () => {
		expect(ParameterInputIconModule.parameterInputs?.[0].capabilities).toBeUndefined();
	});

	// Import-light: the descriptor must not pull the component into the shell chunk.
	it('loads the component lazily', () => {
		expect(typeof ParameterInputIconModule.parameterInputs?.[0].component).toBe('function');
	});

	// No backend half, so `isModuleActive(id)` is always false here.
	// `registerModulePushHandlers` gates on it directly, so a handler would never
	// fire; a route registers, but `checkModuleAvailability` then blocks navigation
	// once the route opts into `custom` middleware. The other surfaces are ungated,
	// so they are deliberately not asserted.
	it('contributes no gated surface', () => {
		expect(ParameterInputIconModule.routes).toBeUndefined();
		expect(ParameterInputIconModule.pushHandlers).toBeUndefined();
	});
});
