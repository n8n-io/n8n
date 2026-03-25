import { MockerRegistry } from '@vitest/mocker';
import { ModuleMocker, createCompilerHints } from '@vitest/mocker/browser';

/** An interceptor for module mocking. */
export class ModuleMockerInterceptor {
  // A registry for runtime mocks (e.g., `sb.mock('path', () => ({}))`)
  mocks = new MockerRegistry();

  constructor() {}

  /**
   * Called by ModuleMocker when `sb.mock()` is executed. We just store the mock in our registry.
   * The dynamic MSW handler will pick it up on the next relevant network request. Currently, we
   * don't use this.mocks in any way. Mocks will be registered in the user's preview file and live
   * until the end. There is no way to invalidate or delete them.
   */
  async register(module) {
    this.mocks.add(module);
  }

  async delete(url) {
    this.mocks.delete(url);
  }

  async invalidate() {
    this.mocks.clear();
  }
}

// Dummy implementation of the RPC interface, since it is not used in build mode.
const rpc = (method) => {
  switch (method) {
    case 'resolveId':
      return Promise.resolve({
        id: '',
        url: '',
        optimized: false,
      });
    case 'resolveMock':
      return Promise.resolve({
        mockType: 'dummy',
        resolvedId: '',
        resolvedUrl: '',
        redirectUrl: '',
        needsInterop: false,
      });
    case 'invalidate':
      return Promise.resolve();
  }
};

// In build mode, we don't need runtime handling of mocks.
// Everything is handled at build time and via the MSW interceptor.
class BuildModuleMocker extends ModuleMocker {
  queueMock() {
    // noop
  }
}

function registerModuleMocker(interceptor) {
  const mocker = new BuildModuleMocker(
    interceptor('__vitest_mocker__'),
    {
      resolveId(id, importer) {
        return rpc('resolveId', { id, importer });
      },
      resolveMock(id, importer, options) {
        return rpc('resolveMock', { id, importer, options });
      },
      async invalidate(ids) {
        return rpc('invalidate', { ids });
      },
    },
    (...args) => {
      return globalThis.__STORYBOOK_MODULE_TEST__.spyOn(...args);
    },
    {
      root: '',
    }
  );

  globalThis['__vitest_mocker__'] = mocker;

  return createCompilerHints({
    globalThisKey: '__vitest_mocker__',
  });
}

globalThis.__STORYBOOK_MOCKER__ = registerModuleMocker(() => new ModuleMockerInterceptor());
