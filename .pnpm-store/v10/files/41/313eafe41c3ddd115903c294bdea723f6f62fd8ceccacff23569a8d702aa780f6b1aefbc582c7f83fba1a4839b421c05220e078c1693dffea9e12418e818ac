# `@jest/utils`

This packages is a collection of utilities and helper functions

## `ErrorWithStack`

This custom error class can be useful when you need to capture the stack trace of an error and provide additional context to the error message. By default, JavaScript errors only capture the stack trace when they are thrown, but this class allows you to capture the stack trace at any point in your code by calling its constructor.

## `clearLine`

It ensures that the clearing operation is only performed when running in a terminal environment, and not when the output is redirected to a file or another non-terminal destination.

## `convertDescriptorToString`

It defines a function named `convertDescriptorToString` that takes a descriptor as input and converts it to a string based on its type. It handles various types such as functions, numbers, strings, and undefined values. If the input doesn't match any of these types, it throws an error with a descriptive message.

## `createDirectory`

It creates new directory and also allows creation of nested directories.

## `deepCyclicCopy`

The `deepCyclicCopy` function provides deep copying of JavaScript objects and arrays, including handling circular references. It offers optional customization through a `DeepCyclicCopyOptions` parameter, allowing users to blacklist properties and preserve object prototypes. The function returns a completely independent deep copy of the input data structure.

## `formatTime`

This function is useful for formatting time values with appropriate SI unit prefixes for readability. It expresses time in various units (e.g., milliseconds, microseconds, nanoseconds) while ensuring the formatting is consistent and human-readable.

## `globsToMatcher`

The code efficiently converts a list of glob patterns into a reusable function for matching paths against those patterns, considering negated patterns and optimizing for performance.

## `installCommonGlobals`

Sets up various global variables and functions needed by the Jest testing framework. It ensures that these globals are properly set up for testing scenarios while maintaining compatibility with the environment's global object.

## `interopRequireDefault`

Provides a way to ensure compatibility between ES modules and CommonJS modules by handling the default export behavior appropriately.

## `invariant`

It is a utility used for asserting that a given condition is true. It's often used as a debugging aid during development to catch situations where an expected condition is not met.

## `isInteractive`

Checks whether the current environment is suitable for interactive terminal interactions.

## `isNonNullable`

Used to narrow down the type of a variable within a TypeScript code block, ensuring that it is safe to assume that the value is non-nullable. This can help avoid runtime errors related to null or undefined values.

## `isPromise`

It helps in order to determine whether a given value conforms to the structure of a Promise-like object, which typically has a `then` method. This can be useful when working with asynchronous code to ensure dealing with promises correctly.

## `pluralize`

This function is used to easily generate grammatically correct phrases in text output that depend on the count of items. It ensures that the word is correctly pluralized when needed.

## `preRunMessage`

These functions are intended for use in interactive command-line tools or scripts which provide informative messages to the user while ensuring a clean and responsive interface.

## `replacePathSepForGlob`

The function takes a string `path` as input and replaces backslashes ('\\') with forward slashes ('/') in the path. Used to normalize file paths to be compatible with glob patterns, ensuring consistency in path representation for different operating systems.

## `requireOrImportModule`

This function provides a unified way to load modules regardless of whether they use CommonJS or ESM syntax. It ensures that the default export is applied consistently when needed, allowing users to work with modules that might use different module systems.

## `setGlobal`

Used to set properties with specified values within a global object. It is designed to work in both browser-like and Node.js environments by accepting different types of global objects as input.

## `specialChars`

It defines constants and conditional values for handling platform-specific behaviors in a terminal environment. It determines if the current platform is Windows ('win32') and sets up constants for various symbols and terminal screen clearing escape sequences accordingly, ensuring proper display and behavior on both Windows and non-Windows operating systems.

## `testPathPatternToRegExp`

This function is used for consistency when serializing/deserializing global configurations and ensures that consistent regular expressions are produced for matching test paths.

## `tryRealpath`

Used to resolve the real path of a given path, but if the path doesn't exist or is a directory, it doesn't throw an error and returns the original path string. This can be useful for gracefully handling path resolution in scenarios where some paths might not exist or might be directories.
