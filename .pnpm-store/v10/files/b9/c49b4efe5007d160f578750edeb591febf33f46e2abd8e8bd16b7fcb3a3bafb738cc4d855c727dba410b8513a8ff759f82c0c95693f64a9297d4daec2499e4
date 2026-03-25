"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prerelease_1 = require("../prerelease");
test('confirm featureFlag prints correct message, given API Version', () => {
    const testApiVersion = '2.2.2';
    // All method decorators in TypeScript need target, key, and descriptor arguments:
    const target = {}; // This would be the class prototype in a real use case
    const propertyKey = 'methodToDecorate'; // Name of the method being decorated
    const originalMethod = jest.fn(); // Mock the original method pre-decoration
    const descriptor = {
        value: originalMethod, // The actual method being decorated
    };
    // Apply the decorator
    const result = (0, prerelease_1.prerelease)(testApiVersion)(target, propertyKey, descriptor);
    // Spy on console.warn to confirm the warning message
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    // Call the decorated method
    result.value();
    // Verify that the warning was printed
    expect(consoleWarnSpy).toHaveBeenCalledWith(`This is a prerelease feature implemented against the ${testApiVersion} version of our API.`);
    // Verify that the original method was called
    expect(originalMethod).toHaveBeenCalled();
    // Restore the original console.warn
    consoleWarnSpy.mockRestore();
});
//# sourceMappingURL=prerelease.js.map