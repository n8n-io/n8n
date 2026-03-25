import { getDefaultCurrentScope, getDefaultIsolationScope } from '../defaultScopes.js';
import { Scope } from '../scope.js';
import { isThenable } from '../utils/is.js';
import { getMainCarrier, getSentryCarrier } from '../carrier.js';

/**
 * This is an object that holds a stack of scopes.
 */
class AsyncContextStack {

   constructor(scope, isolationScope) {
    let assignedScope;
    if (!scope) {
      assignedScope = new Scope();
    } else {
      assignedScope = scope;
    }

    let assignedIsolationScope;
    if (!isolationScope) {
      assignedIsolationScope = new Scope();
    } else {
      assignedIsolationScope = isolationScope;
    }

    // scope stack for domains or the process
    this._stack = [{ scope: assignedScope }];
    this._isolationScope = assignedIsolationScope;
  }

  /**
   * Fork a scope for the stack.
   */
   withScope(callback) {
    const scope = this._pushScope();

    let maybePromiseResult;
    try {
      maybePromiseResult = callback(scope);
    } catch (e) {
      this._popScope();
      throw e;
    }

    if (isThenable(maybePromiseResult)) {
      // @ts-expect-error - isThenable returns the wrong type
      return maybePromiseResult.then(
        res => {
          this._popScope();
          return res;
        },
        e => {
          this._popScope();
          throw e;
        },
      );
    }

    this._popScope();
    return maybePromiseResult;
  }

  /**
   * Get the client of the stack.
   */
   getClient() {
    return this.getStackTop().client ;
  }

  /**
   * Returns the scope of the top stack.
   */
   getScope() {
    return this.getStackTop().scope;
  }

  /**
   * Get the isolation scope for the stack.
   */
   getIsolationScope() {
    return this._isolationScope;
  }

  /**
   * Returns the topmost scope layer in the order domain > local > process.
   */
   getStackTop() {
    return this._stack[this._stack.length - 1] ;
  }

  /**
   * Push a scope to the stack.
   */
   _pushScope() {
    // We want to clone the content of prev scope
    const scope = this.getScope().clone();
    this._stack.push({
      client: this.getClient(),
      scope,
    });
    return scope;
  }

  /**
   * Pop a scope from the stack.
   */
   _popScope() {
    if (this._stack.length <= 1) return false;
    return !!this._stack.pop();
  }
}

/**
 * Get the global async context stack.
 * This will be removed during the v8 cycle and is only here to make migration easier.
 */
function getAsyncContextStack() {
  const registry = getMainCarrier();
  const sentry = getSentryCarrier(registry);

  return (sentry.stack = sentry.stack || new AsyncContextStack(getDefaultCurrentScope(), getDefaultIsolationScope()));
}

function withScope(callback) {
  return getAsyncContextStack().withScope(callback);
}

function withSetScope(scope, callback) {
  const stack = getAsyncContextStack();
  return stack.withScope(() => {
    stack.getStackTop().scope = scope;
    return callback(scope);
  });
}

function withIsolationScope(callback) {
  return getAsyncContextStack().withScope(() => {
    return callback(getAsyncContextStack().getIsolationScope());
  });
}

/**
 * Get the stack-based async context strategy.
 */
function getStackAsyncContextStrategy() {
  return {
    withIsolationScope,
    withScope,
    withSetScope,
    withSetIsolationScope: (_isolationScope, callback) => {
      return withIsolationScope(callback);
    },
    getCurrentScope: () => getAsyncContextStack().getScope(),
    getIsolationScope: () => getAsyncContextStack().getIsolationScope(),
  };
}

export { AsyncContextStack, getStackAsyncContextStrategy };
//# sourceMappingURL=stackStrategy.js.map
