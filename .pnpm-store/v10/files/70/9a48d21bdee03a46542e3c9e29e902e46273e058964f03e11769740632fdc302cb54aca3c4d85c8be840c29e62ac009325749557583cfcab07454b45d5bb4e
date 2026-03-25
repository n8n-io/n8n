export { A as AutomockedModule, b as AutospiedModule, a as ManualMockedModule, M as MockerRegistry, R as RedirectedModule } from './chunk-registry.js';

function mockObject(options, object, mockExports = {}) {
	const finalizers = new Array();
	const refs = new RefTracker();
	const define = (container, key, value) => {
		try {
			container[key] = value;
			return true;
		} catch {
			return false;
		}
	};
	const mockPropertiesOf = (container, newContainer) => {
		const containerType = getType(container);
		const isModule = containerType === "Module" || !!container.__esModule;
		for (const { key: property, descriptor } of getAllMockableProperties(container, isModule, options.globalConstructors)) {
			if (!isModule && descriptor.get) {
				try {
					Object.defineProperty(newContainer, property, descriptor);
				} catch {}
				continue;
			}
			if (isSpecialProp(property, containerType)) {
				continue;
			}
			const value = container[property];
			const refId = refs.getId(value);
			if (refId !== undefined) {
				finalizers.push(() => define(newContainer, property, refs.getMockedValue(refId)));
				continue;
			}
			const type = getType(value);
			if (Array.isArray(value)) {
				define(newContainer, property, []);
				continue;
			}
			const isFunction = type.includes("Function") && typeof value === "function";
			if ((!isFunction || value._isMockFunction) && type !== "Object" && type !== "Module") {
				define(newContainer, property, value);
				continue;
			}
			if (!define(newContainer, property, isFunction ? value : {})) {
				continue;
			}
			if (isFunction) {
				if (!options.spyOn) {
					throw new Error("[@vitest/mocker] `spyOn` is not defined. This is a Vitest error. Please open a new issue with reproduction.");
				}
				const spyOn = options.spyOn;
				function mockFunction() {
					if (this instanceof newContainer[property]) {
						for (const { key, descriptor } of getAllMockableProperties(this, false, options.globalConstructors)) {
							if (descriptor.get) {
								continue;
							}
							const value = this[key];
							const type = getType(value);
							const isFunction = type.includes("Function") && typeof value === "function";
							if (isFunction) {
								const original = this[key];
								const mock = spyOn(this, key).mockImplementation(original);
								const origMockReset = mock.mockReset;
								mock.mockRestore = mock.mockReset = () => {
									origMockReset.call(mock);
									mock.mockImplementation(original);
									return mock;
								};
							}
						}
					}
				}
				const mock = spyOn(newContainer, property);
				if (options.type === "automock") {
					mock.mockImplementation(mockFunction);
					const origMockReset = mock.mockReset;
					mock.mockRestore = mock.mockReset = () => {
						origMockReset.call(mock);
						mock.mockImplementation(mockFunction);
						return mock;
					};
				}
				Object.defineProperty(newContainer[property], "length", { value: 0 });
			}
			refs.track(value, newContainer[property]);
			mockPropertiesOf(value, newContainer[property]);
		}
	};
	const mockedObject = mockExports;
	mockPropertiesOf(object, mockedObject);
	for (const finalizer of finalizers) {
		finalizer();
	}
	return mockedObject;
}
class RefTracker {
	idMap = new Map();
	mockedValueMap = new Map();
	getId(value) {
		return this.idMap.get(value);
	}
	getMockedValue(id) {
		return this.mockedValueMap.get(id);
	}
	track(originalValue, mockedValue) {
		const newId = this.idMap.size;
		this.idMap.set(originalValue, newId);
		this.mockedValueMap.set(newId, mockedValue);
		return newId;
	}
}
function getType(value) {
	return Object.prototype.toString.apply(value).slice(8, -1);
}
function isSpecialProp(prop, parentType) {
	return parentType.includes("Function") && typeof prop === "string" && [
		"arguments",
		"callee",
		"caller",
		"length",
		"name"
	].includes(prop);
}
function getAllMockableProperties(obj, isModule, constructors) {
	const { Map, Object, Function, RegExp, Array } = constructors;
	const allProps = new Map();
	let curr = obj;
	do {
		if (curr === Object.prototype || curr === Function.prototype || curr === RegExp.prototype) {
			break;
		}
		collectOwnProperties(curr, (key) => {
			const descriptor = Object.getOwnPropertyDescriptor(curr, key);
			if (descriptor) {
				allProps.set(key, {
					key,
					descriptor
				});
			}
		});
	} while (curr = Object.getPrototypeOf(curr));
	if (isModule && !allProps.has("default") && "default" in obj) {
		const descriptor = Object.getOwnPropertyDescriptor(obj, "default");
		if (descriptor) {
			allProps.set("default", {
				key: "default",
				descriptor
			});
		}
	}
	return Array.from(allProps.values());
}
function collectOwnProperties(obj, collector) {
	const collect = typeof collector === "function" ? collector : (key) => collector.add(key);
	Object.getOwnPropertyNames(obj).forEach(collect);
	Object.getOwnPropertySymbols(obj).forEach(collect);
}

export { mockObject };
