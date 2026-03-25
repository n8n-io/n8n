import Promise = require('./index');

declare function register (module?: string, options?: register.Options): register.Register;

declare namespace register {
  export interface Register {
    Promise: typeof Promise;
    implementation: string;
  }

  export interface Options {
      Promise?: typeof Promise;
      global?: boolean
  }
}

export = register;
