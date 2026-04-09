// WebIDL requires passing the right number of non-optional arguments, e.g. IDBFactory.open() must have at least 1 arg
export function validateRequiredArguments(numArguments, expectedNumArguments, methodName) {
  if (numArguments < expectedNumArguments) {
    // imitate Firefox's error message
    throw new TypeError(`${methodName}: At least ${expectedNumArguments} ${expectedNumArguments === 1 ? "argument" : "arguments"} ` + `required, but only ${arguments.length} passed`);
  }
}