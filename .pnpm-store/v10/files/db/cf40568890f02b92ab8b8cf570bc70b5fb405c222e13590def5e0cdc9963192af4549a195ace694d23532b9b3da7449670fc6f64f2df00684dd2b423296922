import * as Utils from './utils';
import Exception from './exception';
import {
  COMPILER_REVISION,
  createFrame,
  LAST_COMPATIBLE_COMPILER_REVISION,
  REVISION_CHANGES
} from './base';
import { moveHelperToHooks } from './helpers';
import { wrapHelper } from './internal/wrapHelper';
import {
  createProtoAccessControl,
  resultIsAllowed
} from './internal/proto-access';

export function checkRevision(compilerInfo) {
  const compilerRevision = (compilerInfo && compilerInfo[0]) || 1,
    currentRevision = COMPILER_REVISION;

  if (
    compilerRevision >= LAST_COMPATIBLE_COMPILER_REVISION &&
    compilerRevision <= COMPILER_REVISION
  ) {
    return;
  }

  if (compilerRevision < LAST_COMPATIBLE_COMPILER_REVISION) {
    const runtimeVersions = REVISION_CHANGES[currentRevision],
      compilerVersions = REVISION_CHANGES[compilerRevision];
    throw new Exception(
      'Template was precompiled with an older version of Handlebars than the current runtime. ' +
        'Please update your precompiler to a newer version (' +
        runtimeVersions +
        ') or downgrade your runtime to an older version (' +
        compilerVersions +
        ').'
    );
  } else {
    // Use the embedded version info since the runtime doesn't know about this revision yet
    throw new Exception(
      'Template was precompiled with a newer version of Handlebars than the current runtime. ' +
        'Please update your runtime to a newer version (' +
        compilerInfo[1] +
        ').'
    );
  }
}

export function template(templateSpec, env) {
  /* istanbul ignore next */
  if (!env) {
    throw new Exception('No environment passed to template');
  }
  if (!templateSpec || !templateSpec.main) {
    throw new Exception('Unknown template object: ' + typeof templateSpec);
  }

  templateSpec.main.decorator = templateSpec.main_d;

  // Note: Using env.VM references rather than local var references throughout this section to allow
  // for external users to override these as pseudo-supported APIs.
  env.VM.checkRevision(templateSpec.compiler);

  // backwards compatibility for precompiled templates with compiler-version 7 (<4.3.0)
  const templateWasPrecompiledWithCompilerV7 =
    templateSpec.compiler && templateSpec.compiler[0] === 7;

  function invokePartialWrapper(partial, context, options) {
    if (options.hash) {
      context = Utils.extend({}, context, options.hash);
      if (options.ids) {
        options.ids[0] = true;
      }
    }
    partial = env.VM.resolvePartial.call(this, partial, context, options);

    let extendedOptions = Utils.extend({}, options, {
      hooks: this.hooks,
      protoAccessControl: this.protoAccessControl
    });

    let result = env.VM.invokePartial.call(
      this,
      partial,
      context,
      extendedOptions
    );

    if (result == null && env.compile) {
      options.partials[options.name] = env.compile(
        partial,
        templateSpec.compilerOptions,
        env
      );
      result = options.partials[options.name](context, extendedOptions);
    }
    if (result != null) {
      if (options.indent) {
        let lines = result.split('\n');
        for (let i = 0, l = lines.length; i < l; i++) {
          if (!lines[i] && i + 1 === l) {
            break;
          }

          lines[i] = options.indent + lines[i];
        }
        result = lines.join('\n');
      }
      return result;
    } else {
      throw new Exception(
        'The partial ' +
          options.name +
          ' could not be compiled when running in runtime-only mode'
      );
    }
  }

  // Just add water
  let container = {
    strict: function(obj, name, loc) {
      if (!obj || !(name in obj)) {
        throw new Exception('"' + name + '" not defined in ' + obj, {
          loc: loc
        });
      }
      return container.lookupProperty(obj, name);
    },
    lookupProperty: function(parent, propertyName) {
      let result = parent[propertyName];
      if (result == null) {
        return result;
      }
      if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
        return result;
      }

      if (resultIsAllowed(result, container.protoAccessControl, propertyName)) {
        return result;
      }
      return undefined;
    },
    lookup: function(depths, name) {
      const len = depths.length;
      for (let i = 0; i < len; i++) {
        let result = depths[i] && container.lookupProperty(depths[i], name);
        if (result != null) {
          return depths[i][name];
        }
      }
    },
    lambda: function(current, context) {
      return typeof current === 'function' ? current.call(context) : current;
    },

    escapeExpression: Utils.escapeExpression,
    invokePartial: invokePartialWrapper,

    fn: function(i) {
      let ret = templateSpec[i];
      ret.decorator = templateSpec[i + '_d'];
      return ret;
    },

    programs: [],
    program: function(i, data, declaredBlockParams, blockParams, depths) {
      let programWrapper = this.programs[i],
        fn = this.fn(i);
      if (data || depths || blockParams || declaredBlockParams) {
        programWrapper = wrapProgram(
          this,
          i,
          fn,
          data,
          declaredBlockParams,
          blockParams,
          depths
        );
      } else if (!programWrapper) {
        programWrapper = this.programs[i] = wrapProgram(this, i, fn);
      }
      return programWrapper;
    },

    data: function(value, depth) {
      while (value && depth--) {
        value = value._parent;
      }
      return value;
    },
    mergeIfNeeded: function(param, common) {
      let obj = param || common;

      if (param && common && param !== common) {
        obj = Utils.extend({}, common, param);
      }

      return obj;
    },
    // An empty object to use as replacement for null-contexts
    nullContext: Object.seal({}),

    noop: env.VM.noop,
    compilerInfo: templateSpec.compiler
  };

  function ret(context, options = {}) {
    let data = options.data;

    ret._setup(options);
    if (!options.partial && templateSpec.useData) {
      data = initData(context, data);
    }
    let depths,
      blockParams = templateSpec.useBlockParams ? [] : undefined;
    if (templateSpec.useDepths) {
      if (options.depths) {
        depths =
          context != options.depths[0]
            ? [context].concat(options.depths)
            : options.depths;
      } else {
        depths = [context];
      }
    }

    function main(context /*, options*/) {
      return (
        '' +
        templateSpec.main(
          container,
          context,
          container.helpers,
          container.partials,
          data,
          blockParams,
          depths
        )
      );
    }

    main = executeDecorators(
      templateSpec.main,
      main,
      container,
      options.depths || [],
      data,
      blockParams
    );
    return main(context, options);
  }

  ret.isTop = true;

  ret._setup = function(options) {
    if (!options.partial) {
      let mergedHelpers = Utils.extend({}, env.helpers, options.helpers);
      wrapHelpersToPassLookupProperty(mergedHelpers, container);
      container.helpers = mergedHelpers;

      if (templateSpec.usePartial) {
        // Use mergeIfNeeded here to prevent compiling global partials multiple times
        container.partials = container.mergeIfNeeded(
          options.partials,
          env.partials
        );
      }
      if (templateSpec.usePartial || templateSpec.useDecorators) {
        container.decorators = Utils.extend(
          {},
          env.decorators,
          options.decorators
        );
      }

      container.hooks = {};
      container.protoAccessControl = createProtoAccessControl(options);

      let keepHelperInHelpers =
        options.allowCallsToHelperMissing ||
        templateWasPrecompiledWithCompilerV7;
      moveHelperToHooks(container, 'helperMissing', keepHelperInHelpers);
      moveHelperToHooks(container, 'blockHelperMissing', keepHelperInHelpers);
    } else {
      container.protoAccessControl = options.protoAccessControl; // internal option
      container.helpers = options.helpers;
      container.partials = options.partials;
      container.decorators = options.decorators;
      container.hooks = options.hooks;
    }
  };

  ret._child = function(i, data, blockParams, depths) {
    if (templateSpec.useBlockParams && !blockParams) {
      throw new Exception('must pass block params');
    }
    if (templateSpec.useDepths && !depths) {
      throw new Exception('must pass parent depths');
    }

    return wrapProgram(
      container,
      i,
      templateSpec[i],
      data,
      0,
      blockParams,
      depths
    );
  };
  return ret;
}

export function wrapProgram(
  container,
  i,
  fn,
  data,
  declaredBlockParams,
  blockParams,
  depths
) {
  function prog(context, options = {}) {
    let currentDepths = depths;
    if (
      depths &&
      context != depths[0] &&
      !(context === container.nullContext && depths[0] === null)
    ) {
      currentDepths = [context].concat(depths);
    }

    return fn(
      container,
      context,
      container.helpers,
      container.partials,
      options.data || data,
      blockParams && [options.blockParams].concat(blockParams),
      currentDepths
    );
  }

  prog = executeDecorators(fn, prog, container, depths, data, blockParams);

  prog.program = i;
  prog.depth = depths ? depths.length : 0;
  prog.blockParams = declaredBlockParams || 0;
  return prog;
}

/**
 * This is currently part of the official API, therefore implementation details should not be changed.
 */
export function resolvePartial(partial, context, options) {
  if (!partial) {
    if (options.name === '@partial-block') {
      partial = options.data['partial-block'];
    } else {
      partial = options.partials[options.name];
    }
  } else if (!partial.call && !options.name) {
    // This is a dynamic partial that returned a string
    options.name = partial;
    partial = options.partials[partial];
  }
  return partial;
}

export function invokePartial(partial, context, options) {
  // Use the current closure context to save the partial-block if this partial
  const currentPartialBlock = options.data && options.data['partial-block'];
  options.partial = true;
  if (options.ids) {
    options.data.contextPath = options.ids[0] || options.data.contextPath;
  }

  let partialBlock;
  if (options.fn && options.fn !== noop) {
    options.data = createFrame(options.data);
    // Wrapper function to get access to currentPartialBlock from the closure
    let fn = options.fn;
    partialBlock = options.data['partial-block'] = function partialBlockWrapper(
      context,
      options = {}
    ) {
      // Restore the partial-block from the closure for the execution of the block
      // i.e. the part inside the block of the partial call.
      options.data = createFrame(options.data);
      options.data['partial-block'] = currentPartialBlock;
      return fn(context, options);
    };
    if (fn.partials) {
      options.partials = Utils.extend({}, options.partials, fn.partials);
    }
  }

  if (partial === undefined && partialBlock) {
    partial = partialBlock;
  }

  if (partial === undefined) {
    throw new Exception('The partial ' + options.name + ' could not be found');
  } else if (partial instanceof Function) {
    return partial(context, options);
  }
}

export function noop() {
  return '';
}

function initData(context, data) {
  if (!data || !('root' in data)) {
    data = data ? createFrame(data) : {};
    data.root = context;
  }
  return data;
}

function executeDecorators(fn, prog, container, depths, data, blockParams) {
  if (fn.decorator) {
    let props = {};
    prog = fn.decorator(
      prog,
      props,
      container,
      depths && depths[0],
      data,
      blockParams,
      depths
    );
    Utils.extend(prog, props);
  }
  return prog;
}

function wrapHelpersToPassLookupProperty(mergedHelpers, container) {
  Object.keys(mergedHelpers).forEach(helperName => {
    let helper = mergedHelpers[helperName];
    mergedHelpers[helperName] = passLookupPropertyOption(helper, container);
  });
}

function passLookupPropertyOption(helper, container) {
  const lookupProperty = container.lookupProperty;
  return wrapHelper(helper, options => {
    return Utils.extend({ lookupProperty }, options);
  });
}
