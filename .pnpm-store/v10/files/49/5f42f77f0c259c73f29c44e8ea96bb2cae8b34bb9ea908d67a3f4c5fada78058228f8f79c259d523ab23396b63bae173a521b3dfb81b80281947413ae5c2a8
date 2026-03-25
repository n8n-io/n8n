var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __reflectGet = Reflect.get;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __superGet = (cls, obj, key) => __reflectGet(__getProtoOf(cls), key, obj);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// lib/index.ts
var index_exports = {};
__export(index_exports, {
  AnnotatedScreenshotText: () => AnnotatedScreenshotText,
  AvailableModelSchema: () => AvailableModelSchema,
  LLMClient: () => LLMClient,
  PlaywrightCommandException: () => PlaywrightCommandException,
  PlaywrightCommandMethodNotSupportedException: () => PlaywrightCommandMethodNotSupportedException,
  Stagehand: () => Stagehand,
  defaultExtractSchema: () => defaultExtractSchema,
  pageTextSchema: () => pageTextSchema
});
module.exports = __toCommonJS(index_exports);
var import_sdk3 = require("@browserbasehq/sdk");
var import_test2 = require("@playwright/test");
var import_crypto2 = require("crypto");
var import_dotenv = __toESM(require("dotenv"));
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));

// lib/StagehandPage.ts
var import_sdk = require("@browserbasehq/sdk");
var import_test = require("@playwright/test");

// types/page.ts
var import_zod = require("zod");
var defaultExtractSchema = import_zod.z.object({
  extraction: import_zod.z.string()
});
var pageTextSchema = import_zod.z.object({
  page_text: import_zod.z.string()
});

// types/playwright.ts
var PlaywrightCommandException = class extends Error {
  constructor(message) {
    super(message);
    this.name = "PlaywrightCommandException";
  }
};
var PlaywrightCommandMethodNotSupportedException = class extends Error {
  constructor(message) {
    super(message);
    this.name = "PlaywrightCommandMethodNotSupportedException";
  }
};

// lib/cache/BaseCache.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var crypto = __toESM(require("crypto"));
var BaseCache = class {
  constructor(logger, cacheDir = path.join(process.cwd(), "tmp", ".cache"), cacheFile = "cache.json") {
    this.CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1e3;
    // 1 week in milliseconds
    this.CLEANUP_PROBABILITY = 0.01;
    this.LOCK_TIMEOUT_MS = 1e3;
    this.lockAcquired = false;
    this.lockAcquireFailures = 0;
    // Added for request ID tracking
    this.requestIdToUsedHashes = {};
    this.logger = logger;
    this.cacheDir = cacheDir;
    this.cacheFile = path.join(cacheDir, cacheFile);
    this.lockFile = path.join(cacheDir, "cache.lock");
    this.ensureCacheDirectory();
    this.setupProcessHandlers();
  }
  setupProcessHandlers() {
    const releaseLockAndExit = () => {
      this.releaseLock();
      process.exit();
    };
    process.on("exit", releaseLockAndExit);
    process.on("SIGINT", releaseLockAndExit);
    process.on("SIGTERM", releaseLockAndExit);
    process.on("uncaughtException", (err) => {
      this.logger({
        category: "base_cache",
        message: "uncaught exception",
        level: 2,
        auxiliary: {
          error: {
            value: err.message,
            type: "string"
          },
          trace: {
            value: err.stack,
            type: "string"
          }
        }
      });
      if (this.lockAcquired) {
        releaseLockAndExit();
      }
    });
  }
  ensureCacheDirectory() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      this.logger({
        category: "base_cache",
        message: "created cache directory",
        level: 1,
        auxiliary: {
          cacheDir: {
            value: this.cacheDir,
            type: "string"
          }
        }
      });
    }
  }
  createHash(data) {
    const hash = crypto.createHash("sha256");
    return hash.update(JSON.stringify(data)).digest("hex");
  }
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  acquireLock() {
    return __async(this, null, function* () {
      const startTime = Date.now();
      while (Date.now() - startTime < this.LOCK_TIMEOUT_MS) {
        try {
          if (fs.existsSync(this.lockFile)) {
            const lockAge = Date.now() - fs.statSync(this.lockFile).mtimeMs;
            if (lockAge > this.LOCK_TIMEOUT_MS) {
              fs.unlinkSync(this.lockFile);
              this.logger({
                category: "base_cache",
                message: "Stale lock file removed",
                level: 1
              });
            }
          }
          fs.writeFileSync(this.lockFile, process.pid.toString(), { flag: "wx" });
          this.lockAcquireFailures = 0;
          this.lockAcquired = true;
          this.logger({
            category: "base_cache",
            message: "Lock acquired",
            level: 1
          });
          return true;
        } catch (e) {
          this.logger({
            category: "base_cache",
            message: "error acquiring lock",
            level: 2,
            auxiliary: {
              trace: {
                value: e.stack,
                type: "string"
              },
              message: {
                value: e.message,
                type: "string"
              }
            }
          });
          yield this.sleep(5);
        }
      }
      this.logger({
        category: "base_cache",
        message: "Failed to acquire lock after timeout",
        level: 2
      });
      this.lockAcquireFailures++;
      if (this.lockAcquireFailures >= 3) {
        this.logger({
          category: "base_cache",
          message: "Failed to acquire lock 3 times in a row. Releasing lock manually.",
          level: 1
        });
        this.releaseLock();
      }
      return false;
    });
  }
  releaseLock() {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
        this.logger({
          category: "base_cache",
          message: "Lock released",
          level: 1
        });
      }
      this.lockAcquired = false;
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error releasing lock",
        level: 2,
        auxiliary: {
          error: {
            value: error.message,
            type: "string"
          },
          trace: {
            value: error.stack,
            type: "string"
          }
        }
      });
    }
  }
  /**
   * Cleans up stale cache entries that exceed the maximum age.
   */
  cleanupStaleEntries() {
    return __async(this, null, function* () {
      if (!(yield this.acquireLock())) {
        this.logger({
          category: "llm_cache",
          message: "failed to acquire lock for cleanup",
          level: 2
        });
        return;
      }
      try {
        const cache = this.readCache();
        const now = Date.now();
        let entriesRemoved = 0;
        for (const [hash, entry] of Object.entries(cache)) {
          if (now - entry.timestamp > this.CACHE_MAX_AGE_MS) {
            delete cache[hash];
            entriesRemoved++;
          }
        }
        if (entriesRemoved > 0) {
          this.writeCache(cache);
          this.logger({
            category: "llm_cache",
            message: "cleaned up stale cache entries",
            level: 1,
            auxiliary: {
              entriesRemoved: {
                value: entriesRemoved.toString(),
                type: "integer"
              }
            }
          });
        }
      } catch (error) {
        this.logger({
          category: "llm_cache",
          message: "error during cache cleanup",
          level: 2,
          auxiliary: {
            error: {
              value: error.message,
              type: "string"
            },
            trace: {
              value: error.stack,
              type: "string"
            }
          }
        });
      } finally {
        this.releaseLock();
      }
    });
  }
  readCache() {
    if (fs.existsSync(this.cacheFile)) {
      try {
        const data = fs.readFileSync(this.cacheFile, "utf-8");
        return JSON.parse(data);
      } catch (error) {
        this.logger({
          category: "base_cache",
          message: "error reading cache file. resetting cache.",
          level: 1,
          auxiliary: {
            error: {
              value: error.message,
              type: "string"
            },
            trace: {
              value: error.stack,
              type: "string"
            }
          }
        });
        this.resetCache();
        return {};
      }
    }
    return {};
  }
  writeCache(cache) {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
      this.logger({
        category: "base_cache",
        message: "Cache written to file",
        level: 1
      });
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error writing cache file",
        level: 2,
        auxiliary: {
          error: {
            value: error.message,
            type: "string"
          },
          trace: {
            value: error.stack,
            type: "string"
          }
        }
      });
    } finally {
      this.releaseLock();
    }
  }
  /**
   * Retrieves data from the cache based on the provided options.
   * @param hashObj - The options used to generate the cache key.
   * @param requestId - The identifier for the current request.
   * @returns The cached data if available, otherwise null.
   */
  get(hashObj, requestId) {
    return __async(this, null, function* () {
      if (!(yield this.acquireLock())) {
        this.logger({
          category: "base_cache",
          message: "Failed to acquire lock for getting cache",
          level: 2
        });
        return null;
      }
      try {
        const hash = this.createHash(hashObj);
        const cache = this.readCache();
        if (cache[hash]) {
          this.trackRequestIdUsage(requestId, hash);
          return cache[hash].data;
        }
        return null;
      } catch (error) {
        this.logger({
          category: "base_cache",
          message: "error getting cache. resetting cache.",
          level: 1,
          auxiliary: {
            error: {
              value: error.message,
              type: "string"
            },
            trace: {
              value: error.stack,
              type: "string"
            }
          }
        });
        this.resetCache();
        return null;
      } finally {
        this.releaseLock();
      }
    });
  }
  /**
   * Stores data in the cache based on the provided options and requestId.
   * @param hashObj - The options used to generate the cache key.
   * @param data - The data to be cached.
   * @param requestId - The identifier for the cache entry.
   */
  set(hashObj, data, requestId) {
    return __async(this, null, function* () {
      if (!(yield this.acquireLock())) {
        this.logger({
          category: "base_cache",
          message: "Failed to acquire lock for setting cache",
          level: 2
        });
        return;
      }
      try {
        const hash = this.createHash(hashObj);
        const cache = this.readCache();
        cache[hash] = {
          data,
          timestamp: Date.now(),
          requestId
        };
        this.writeCache(cache);
        this.trackRequestIdUsage(requestId, hash);
      } catch (error) {
        this.logger({
          category: "base_cache",
          message: "error setting cache. resetting cache.",
          level: 1,
          auxiliary: {
            error: {
              value: error.message,
              type: "string"
            },
            trace: {
              value: error.stack,
              type: "string"
            }
          }
        });
        this.resetCache();
      } finally {
        this.releaseLock();
        if (Math.random() < this.CLEANUP_PROBABILITY) {
          this.cleanupStaleEntries();
        }
      }
    });
  }
  delete(hashObj) {
    return __async(this, null, function* () {
      if (!(yield this.acquireLock())) {
        this.logger({
          category: "base_cache",
          message: "Failed to acquire lock for removing cache entry",
          level: 2
        });
        return;
      }
      try {
        const hash = this.createHash(hashObj);
        const cache = this.readCache();
        if (cache[hash]) {
          delete cache[hash];
          this.writeCache(cache);
        } else {
          this.logger({
            category: "base_cache",
            message: "Cache entry not found to delete",
            level: 1
          });
        }
      } catch (error) {
        this.logger({
          category: "base_cache",
          message: "error removing cache entry",
          level: 2,
          auxiliary: {
            error: {
              value: error.message,
              type: "string"
            },
            trace: {
              value: error.stack,
              type: "string"
            }
          }
        });
      } finally {
        this.releaseLock();
      }
    });
  }
  /**
   * Tracks the usage of a hash with a specific requestId.
   * @param requestId - The identifier for the current request.
   * @param hash - The cache key hash.
   */
  trackRequestIdUsage(requestId, hash) {
    var _a, _b;
    (_b = (_a = this.requestIdToUsedHashes)[requestId]) != null ? _b : _a[requestId] = [];
    this.requestIdToUsedHashes[requestId].push(hash);
  }
  /**
   * Deletes all cache entries associated with a specific requestId.
   * @param requestId - The identifier for the request whose cache entries should be deleted.
   */
  deleteCacheForRequestId(requestId) {
    return __async(this, null, function* () {
      var _a;
      if (!(yield this.acquireLock())) {
        this.logger({
          category: "base_cache",
          message: "Failed to acquire lock for deleting cache",
          level: 2
        });
        return;
      }
      try {
        const cache = this.readCache();
        const hashes = (_a = this.requestIdToUsedHashes[requestId]) != null ? _a : [];
        let entriesRemoved = 0;
        for (const hash of hashes) {
          if (cache[hash]) {
            delete cache[hash];
            entriesRemoved++;
          }
        }
        if (entriesRemoved > 0) {
          this.writeCache(cache);
        } else {
          this.logger({
            category: "base_cache",
            message: "no cache entries found for requestId",
            level: 1,
            auxiliary: {
              requestId: {
                value: requestId,
                type: "string"
              }
            }
          });
        }
        delete this.requestIdToUsedHashes[requestId];
      } catch (error) {
        this.logger({
          category: "base_cache",
          message: "error deleting cache for requestId",
          level: 2,
          auxiliary: {
            error: {
              value: error.message,
              type: "string"
            },
            trace: {
              value: error.stack,
              type: "string"
            },
            requestId: {
              value: requestId,
              type: "string"
            }
          }
        });
      } finally {
        this.releaseLock();
      }
    });
  }
  /**
   * Resets the entire cache by clearing the cache file.
   */
  resetCache() {
    try {
      fs.writeFileSync(this.cacheFile, "{}");
      this.requestIdToUsedHashes = {};
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error resetting cache",
        level: 2,
        auxiliary: {
          error: {
            value: error.message,
            type: "string"
          },
          trace: {
            value: error.stack,
            type: "string"
          }
        }
      });
    } finally {
      this.releaseLock();
    }
  }
};

// lib/cache/ActionCache.ts
var ActionCache = class _ActionCache extends BaseCache {
  constructor(logger, cacheDir, cacheFile) {
    super(logger, cacheDir, cacheFile || "action_cache.json");
  }
  addActionStep(_0) {
    return __async(this, arguments, function* ({
      url,
      action,
      previousSelectors,
      playwrightCommand,
      componentString,
      xpaths,
      newStepString,
      completed,
      requestId
    }) {
      this.logger({
        category: "action_cache",
        message: "adding action step to cache",
        level: 1,
        auxiliary: {
          action: {
            value: action,
            type: "string"
          },
          requestId: {
            value: requestId,
            type: "string"
          },
          url: {
            value: url,
            type: "string"
          },
          previousSelectors: {
            value: JSON.stringify(previousSelectors),
            type: "object"
          }
        }
      });
      yield this.set(
        { url, action, previousSelectors },
        {
          playwrightCommand,
          componentString,
          xpaths,
          newStepString,
          completed,
          previousSelectors,
          action
        },
        requestId
      );
    });
  }
  /**
   * Retrieves all actions for a specific trajectory.
   * @param trajectoryId - Unique identifier for the trajectory.
   * @param requestId - The identifier for the current request.
   * @returns An array of TrajectoryEntry objects or null if not found.
   */
  getActionStep(_0) {
    return __async(this, arguments, function* ({
      url,
      action,
      previousSelectors,
      requestId
    }) {
      const data = yield __superGet(_ActionCache.prototype, this, "get").call(this, { url, action, previousSelectors }, requestId);
      if (!data) {
        return null;
      }
      return data;
    });
  }
  removeActionStep(cacheHashObj) {
    return __async(this, null, function* () {
      yield __superGet(_ActionCache.prototype, this, "delete").call(this, cacheHashObj);
    });
  }
  /**
   * Clears all actions for a specific trajectory.
   * @param trajectoryId - Unique identifier for the trajectory.
   * @param requestId - The identifier for the current request.
   */
  clearAction(requestId) {
    return __async(this, null, function* () {
      yield __superGet(_ActionCache.prototype, this, "deleteCacheForRequestId").call(this, requestId);
      this.logger({
        category: "action_cache",
        message: "cleared action for ID",
        level: 1,
        auxiliary: {
          requestId: {
            value: requestId,
            type: "string"
          }
        }
      });
    });
  }
  /**
   * Resets the entire action cache.
   */
  resetCache() {
    return __async(this, null, function* () {
      yield __superGet(_ActionCache.prototype, this, "resetCache").call(this);
      this.logger({
        category: "action_cache",
        message: "Action cache has been reset.",
        level: 1
      });
    });
  }
};

// lib/inference.ts
var import_zod2 = require("zod");

// lib/prompt.ts
var actSystemPrompt = `
# Instructions
You are a browser automation assistant. Your job is to accomplish the user's goal across multiple model calls by running playwright commands.

## Input
You will receive:
1. the user's overall goal
2. the steps that you've taken so far
3. a list of active DOM elements in this chunk to consider to get closer to the goal. 
4. Optionally, a list of variable names that the user has provided that you may use to accomplish the goal. To use the variables, you must use the special <|VARIABLE_NAME|> syntax.
5. Optionally, custom instructions will be provided by the user. If the user's instructions are not relevant to the current task, ignore them. Otherwise, make sure to adhere to them.


## Your Goal / Specification
You have 2 tools that you can call: doAction, and skipSection. Do action only performs Playwright actions. Do exactly what the user's goal is. Do not perform any other actions or exceed the scope of the goal.
If the user's goal will be accomplished after running the playwright action, set completed to true. Better to have completed set to true if your are not sure.

Note 1: If there is a popup on the page for cookies or advertising that has nothing to do with the goal, try to close it first before proceeding. As this can block the goal from being completed.
Note 2: Sometimes what your are looking for is hidden behind and element you need to interact with. For example, sliders, buttons, etc...

Again, if the user's goal will be accomplished after running the playwright action, set completed to true. Also, if the user provides custom instructions, it is imperative that you follow them no matter what.
`;
var verifyActCompletionSystemPrompt = `
You are a browser automation assistant. The job has given you a goal and a list of steps that have been taken so far. Your job is to determine if the user's goal has been completed based on the provided information.

# Input
You will receive:
1. The user's goal: A clear description of what the user wants to achieve.
2. Steps taken so far: A list of actions that have been performed up to this point.

# Your Task
Analyze the provided information to determine if the user's goal has been fully completed.

# Output
Return a boolean value:
- true: If the goal has been definitively completed based on the steps taken and the current page.
- false: If the goal has not been completed or if there's any uncertainty about its completion.

# Important Considerations
- False positives are okay. False negatives are not okay.
- Look for evidence of errors on the page or something having gone wrong in completing the goal. If one does not exist, return true.
`;
function buildVerifyActCompletionSystemPrompt() {
  return {
    role: "system",
    content: verifyActCompletionSystemPrompt
  };
}
function buildVerifyActCompletionUserPrompt(goal, steps = "None", domElements) {
  let actUserPrompt = `
# My Goal
${goal}

# Steps You've Taken So Far
${steps}
`;
  if (domElements) {
    actUserPrompt += `
# Active DOM Elements on the current page
${domElements}
`;
  }
  return {
    role: "user",
    content: actUserPrompt
  };
}
function buildUserInstructionsString(userProvidedInstructions) {
  if (!userProvidedInstructions) {
    return "";
  }
  return `

# Custom Instructions Provided by the User
    
Please keep the user's instructions in mind when performing actions. If the user's instructions are not relevant to the current task, ignore them.

User Instructions:
${userProvidedInstructions}`;
}
function buildActSystemPrompt(userProvidedInstructions) {
  return {
    role: "system",
    content: [
      actSystemPrompt,
      buildUserInstructionsString(userProvidedInstructions)
    ].filter(Boolean).join("\n\n")
  };
}
function buildActUserPrompt(action, steps = "None", domElements, variables) {
  let actUserPrompt = `
# My Goal
${action}

# Steps You've Taken So Far
${steps}

# Current Active Dom Elements
${domElements}
`;
  if (variables && Object.keys(variables).length > 0) {
    actUserPrompt += `
# Variables
${Object.keys(variables).map((key) => `<|${key.toUpperCase()}|>`).join("\n")}
`;
  }
  return {
    role: "user",
    content: actUserPrompt
  };
}
var actTools = [
  {
    type: "function",
    name: "doAction",
    description: "execute the next playwright step that directly accomplishes the goal",
    parameters: {
      type: "object",
      required: ["method", "element", "args", "step", "completed"],
      properties: {
        method: {
          type: "string",
          description: "The playwright function to call."
        },
        element: {
          type: "number",
          description: "The element number to act on"
        },
        args: {
          type: "array",
          description: "The required arguments",
          items: {
            type: "string",
            description: "The argument to pass to the function"
          }
        },
        step: {
          type: "string",
          description: "human readable description of the step that is taken in the past tense. Please be very detailed."
        },
        why: {
          type: "string",
          description: "why is this step taken? how does it advance the goal?"
        },
        completed: {
          type: "boolean",
          description: "true if the goal should be accomplished after this step"
        }
      }
    }
  },
  {
    type: "function",
    name: "skipSection",
    description: "skips this area of the webpage because the current goal cannot be accomplished here",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "reason that no action is taken"
        }
      }
    }
  }
];
function buildExtractSystemPrompt(isUsingPrintExtractedDataTool = false, useTextExtract = true, userProvidedInstructions) {
  const baseContent = `You are extracting content on behalf of a user.
  If a user asks you to extract a 'list' of information, or 'all' information, 
  YOU MUST EXTRACT ALL OF THE INFORMATION THAT THE USER REQUESTS.
   
  You will be given:
1. An instruction
2. `;
  const contentDetail = useTextExtract ? `A text representation of a webpage to extract information from.` : `A list of DOM elements to extract from.`;
  const instructions = `
Print the exact text from the ${useTextExtract ? "text-rendered webpage" : "DOM elements"} with all symbols, characters, and endlines as is.
Print null or an empty string if no new information is found.
  `.trim();
  const toolInstructions = isUsingPrintExtractedDataTool ? `
ONLY print the content using the print_extracted_data tool provided.
ONLY print the content using the print_extracted_data tool provided.
  `.trim() : "";
  const additionalInstructions = useTextExtract ? `Once you are given the text-rendered webpage, 
    you must thoroughly and meticulously analyze it. Be very careful to ensure that you
    do not miss any important information.` : "";
  const userInstructions = buildUserInstructionsString(
    userProvidedInstructions
  );
  const content = `${baseContent}${contentDetail}

${instructions}
${toolInstructions}${additionalInstructions ? `

${additionalInstructions}` : ""}${userInstructions ? `

${userInstructions}` : ""}`.replace(/\s+/g, " ");
  return {
    role: "system",
    content
  };
}
function buildExtractUserPrompt(instruction, domElements, isUsingPrintExtractedDataTool = false) {
  let content = `Instruction: ${instruction}
DOM: ${domElements}`;
  if (isUsingPrintExtractedDataTool) {
    content += `
ONLY print the content using the print_extracted_data tool provided.
ONLY print the content using the print_extracted_data tool provided.`;
  }
  return {
    role: "user",
    content
  };
}
var refineSystemPrompt = `You are tasked with refining and filtering information for the final output based on newly extracted and previously extracted content. Your responsibilities are:
1. Remove exact duplicates for elements in arrays and objects.
2. For text fields, append or update relevant text if the new content is an extension, replacement, or continuation.
3. For non-text fields (e.g., numbers, booleans), update with new values if they differ.
4. Add any completely new fields or objects ONLY IF they correspond to the provided schema.

Return the updated content that includes both the previous content and the new, non-duplicate, or extended information.`;
function buildRefineSystemPrompt() {
  return {
    role: "system",
    content: refineSystemPrompt
  };
}
function buildRefineUserPrompt(instruction, previouslyExtractedContent, newlyExtractedContent) {
  return {
    role: "user",
    content: `Instruction: ${instruction}
Previously extracted content: ${JSON.stringify(previouslyExtractedContent, null, 2)}
Newly extracted content: ${JSON.stringify(newlyExtractedContent, null, 2)}
Refined content:`
  };
}
var metadataSystemPrompt = `You are an AI assistant tasked with evaluating the progress and completion status of an extraction task.
Analyze the extraction response and determine if the task is completed or if more information is needed.

Strictly abide by the following criteria:
1. Once the instruction has been satisfied by the current extraction response, ALWAYS set completion status to true and stop processing, regardless of remaining chunks.
2. Only set completion status to false if BOTH of these conditions are true:
   - The instruction has not been satisfied yet
   - There are still chunks left to process (chunksTotal > chunksSeen)`;
function buildMetadataSystemPrompt() {
  return {
    role: "system",
    content: metadataSystemPrompt
  };
}
function buildMetadataPrompt(instruction, extractionResponse, chunksSeen, chunksTotal) {
  return {
    role: "user",
    content: `Instruction: ${instruction}
Extracted content: ${JSON.stringify(extractionResponse, null, 2)}
chunksSeen: ${chunksSeen}
chunksTotal: ${chunksTotal}`
  };
}
function buildObserveSystemPrompt(userProvidedInstructions, isUsingAccessibilityTree = false) {
  const observeSystemPrompt = `
You are helping the user automate the browser by finding elements based on what the user wants to observe in the page.

You will be given:
1. a instruction of elements to observe
2. ${isUsingAccessibilityTree ? "a hierarchical accessibility tree showing the semantic structure of the page. The tree is a hybrid of the DOM and the accessibility tree." : "a numbered list of possible elements"}

Return an array of elements that match the instruction if they exist, otherwise return an empty array.`;
  const content = observeSystemPrompt.replace(/\s+/g, " ");
  return {
    role: "system",
    content: [content, buildUserInstructionsString(userProvidedInstructions)].filter(Boolean).join("\n\n")
  };
}
function buildObserveUserMessage(instruction, domElements, isUsingAccessibilityTree = false) {
  return {
    role: "user",
    content: `instruction: ${instruction}
${isUsingAccessibilityTree ? "Accessibility Tree" : "DOM"}: ${domElements}`
  };
}
function buildActObservePrompt(action, supportedActions, variables) {
  let instruction = `Find the most relevant element to perform an action on given the following action: ${action}. 
  Provide an action for this element such as ${supportedActions.join(", ")}, or any other playwright locator method. Remember that to users, buttons and links look the same in most cases.
  If the action is completely unrelated to a potential action to be taken on the page, return an empty array. 
  ONLY return one action. If multiple actions are relevant, return the most relevant one.`;
  if (variables && Object.keys(variables).length > 0) {
    const variablesPrompt = `The following variables are available to use in the action: ${Object.keys(variables).join(", ")}. Fill the argument variables with the variable name.`;
    instruction += ` ${variablesPrompt}`;
  }
  return instruction;
}

// lib/inference.ts
function verifyActCompletion(_0) {
  return __async(this, arguments, function* ({
    goal,
    steps,
    llmClient,
    domElements,
    logger,
    requestId
  }) {
    const verificationSchema = import_zod2.z.object({
      completed: import_zod2.z.boolean().describe("true if the goal is accomplished")
    });
    const response = yield llmClient.createChatCompletion({
      options: {
        messages: [
          buildVerifyActCompletionSystemPrompt(),
          buildVerifyActCompletionUserPrompt(goal, steps, domElements)
        ],
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        response_model: {
          name: "Verification",
          schema: verificationSchema
        },
        requestId
      },
      logger
    });
    if (!response || typeof response !== "object") {
      logger({
        category: "VerifyAct",
        message: "Unexpected response format: " + JSON.stringify(response)
      });
      return false;
    }
    if (response.completed === void 0) {
      logger({
        category: "VerifyAct",
        message: "Missing 'completed' field in response"
      });
      return false;
    }
    return response.completed;
  });
}
function fillInVariables(text, variables) {
  let processedText = text;
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `<|${key.toUpperCase()}|>`;
    processedText = processedText.replace(placeholder, value);
  });
  return processedText;
}
function act(_0) {
  return __async(this, arguments, function* ({
    action,
    domElements,
    steps,
    llmClient,
    retries = 0,
    logger,
    requestId,
    variables,
    userProvidedInstructions
  }) {
    const messages = [
      buildActSystemPrompt(userProvidedInstructions),
      buildActUserPrompt(action, steps, domElements, variables)
    ];
    const response = yield llmClient.createChatCompletion({
      options: {
        messages,
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        tool_choice: "auto",
        tools: actTools,
        requestId
      },
      logger
    });
    const toolCalls = response.choices[0].message.tool_calls;
    if (toolCalls && toolCalls.length > 0) {
      if (toolCalls[0].function.name === "skipSection") {
        return null;
      }
      return JSON.parse(toolCalls[0].function.arguments);
    } else {
      if (retries >= 2) {
        logger({
          category: "Act",
          message: "No tool calls found in response"
        });
        return null;
      }
      return act({
        action,
        domElements,
        steps,
        llmClient,
        retries: retries + 1,
        logger,
        requestId
      });
    }
  });
}
function extract(_0) {
  return __async(this, arguments, function* ({
    instruction,
    previouslyExtractedContent,
    domElements,
    schema,
    llmClient,
    chunksSeen,
    chunksTotal,
    requestId,
    logger,
    isUsingTextExtract,
    userProvidedInstructions
  }) {
    const isUsingAnthropic = llmClient.type === "anthropic";
    const extractionResponse = yield llmClient.createChatCompletion({
      options: {
        messages: [
          buildExtractSystemPrompt(
            isUsingAnthropic,
            isUsingTextExtract,
            userProvidedInstructions
          ),
          buildExtractUserPrompt(instruction, domElements, isUsingAnthropic)
        ],
        response_model: {
          schema,
          name: "Extraction"
        },
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        requestId
      },
      logger
    });
    const refinedResponse = yield llmClient.createChatCompletion({
      options: {
        messages: [
          buildRefineSystemPrompt(),
          buildRefineUserPrompt(
            instruction,
            previouslyExtractedContent,
            extractionResponse
          )
        ],
        response_model: {
          schema,
          name: "RefinedExtraction"
        },
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        requestId
      },
      logger
    });
    const metadataSchema = import_zod2.z.object({
      progress: import_zod2.z.string().describe(
        "progress of what has been extracted so far, as concise as possible"
      ),
      completed: import_zod2.z.boolean().describe(
        "true if the goal is now accomplished. Use this conservatively, only when you are sure that the goal has been completed."
      )
    });
    const metadataResponse = yield llmClient.createChatCompletion({
      options: {
        messages: [
          buildMetadataSystemPrompt(),
          buildMetadataPrompt(
            instruction,
            refinedResponse,
            chunksSeen,
            chunksTotal
          )
        ],
        response_model: {
          name: "Metadata",
          schema: metadataSchema
        },
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        requestId
      },
      logger
    });
    return __spreadProps(__spreadValues({}, refinedResponse), {
      metadata: metadataResponse
    });
  });
}
function observe(_0) {
  return __async(this, arguments, function* ({
    instruction,
    domElements,
    llmClient,
    requestId,
    isUsingAccessibilityTree,
    userProvidedInstructions,
    logger,
    returnAction = false
  }) {
    var _a, _b;
    const observeSchema = import_zod2.z.object({
      elements: import_zod2.z.array(
        import_zod2.z.object(__spreadValues({
          elementId: import_zod2.z.number().describe("the number of the element"),
          description: import_zod2.z.string().describe(
            isUsingAccessibilityTree ? "a description of the accessible element and its purpose" : "a description of the element and what it is relevant for"
          )
        }, returnAction ? {
          method: import_zod2.z.string().describe(
            "the candidate method/action to interact with the element. Select one of the available Playwright interaction methods."
          ),
          arguments: import_zod2.z.array(
            import_zod2.z.string().describe(
              "the arguments to pass to the method. For example, for a click, the arguments are empty, but for a fill, the arguments are the value to fill in."
            )
          )
        } : {}))
      ).describe(
        isUsingAccessibilityTree ? "an array of accessible elements that match the instruction" : "an array of elements that match the instruction"
      )
    });
    const observationResponse = yield llmClient.createChatCompletion({
      options: {
        messages: [
          buildObserveSystemPrompt(
            userProvidedInstructions,
            isUsingAccessibilityTree
          ),
          buildObserveUserMessage(
            instruction,
            domElements,
            isUsingAccessibilityTree
          )
        ],
        response_model: {
          schema: observeSchema,
          name: "Observation"
        },
        temperature: 0.1,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        requestId
      },
      logger
    });
    const parsedResponse = {
      elements: (_b = (_a = observationResponse.elements) == null ? void 0 : _a.map((el) => {
        const base = {
          elementId: Number(el.elementId),
          description: String(el.description)
        };
        return returnAction ? __spreadProps(__spreadValues({}, base), {
          method: String(el.method),
          arguments: el.arguments
        }) : base;
      })) != null ? _b : []
    };
    return parsedResponse;
  });
}

// lib/utils.ts
var import_crypto = __toESM(require("crypto"));
var HEURISTIC_CHAR_WIDTH = 5;
function generateId(operation) {
  return import_crypto.default.createHash("sha256").update(operation).digest("hex");
}
function formatText(textAnnotations, pageWidth) {
  const sortedAnnotations = [...textAnnotations].sort(
    (a, b) => a.bottom_left.y - b.bottom_left.y
  );
  const epsilon = 1;
  const lineMap = /* @__PURE__ */ new Map();
  for (const annotation of sortedAnnotations) {
    let foundLineY;
    for (const key of lineMap.keys()) {
      if (Math.abs(key - annotation.bottom_left.y) < epsilon) {
        foundLineY = key;
        break;
      }
    }
    if (foundLineY !== void 0) {
      lineMap.get(foundLineY).push(annotation);
    } else {
      lineMap.set(annotation.bottom_left.y, [annotation]);
    }
  }
  const lineYs = Array.from(lineMap.keys()).sort((a, b) => a - b);
  const finalLines = [];
  for (const lineY of lineYs) {
    const lineAnnotations = lineMap.get(lineY);
    lineAnnotations.sort((a, b) => a.bottom_left.x - b.bottom_left.x);
    const groupedLineAnnotations = groupWordsInSentence(lineAnnotations);
    finalLines.push(groupedLineAnnotations);
  }
  let maxLineWidthInChars = 0;
  for (const line of finalLines) {
    let lineMaxEnd = 0;
    for (const ann of line) {
      const startXInChars = Math.round(
        ann.bottom_left_normalized.x * (pageWidth / HEURISTIC_CHAR_WIDTH)
      );
      const endXInChars = startXInChars + ann.text.length;
      if (endXInChars > lineMaxEnd) {
        lineMaxEnd = endXInChars;
      }
    }
    if (lineMaxEnd > maxLineWidthInChars) {
      maxLineWidthInChars = lineMaxEnd;
    }
  }
  maxLineWidthInChars += 20;
  const canvasWidth = Math.max(maxLineWidthInChars, 1);
  const lineBaselines = finalLines.map(
    (line) => Math.min(...line.map((a) => a.bottom_left.y))
  );
  const verticalGaps = [];
  for (let i = 1; i < lineBaselines.length; i++) {
    verticalGaps.push(lineBaselines[i] - lineBaselines[i - 1]);
  }
  const normalLineSpacing = verticalGaps.length > 0 ? median(verticalGaps) : 0;
  let canvas = [];
  let lineIndex = -1;
  for (let i = 0; i < finalLines.length; i++) {
    if (i === 0) {
      lineIndex++;
      ensureLineExists(canvas, lineIndex, canvasWidth);
    } else {
      const gap = lineBaselines[i] - lineBaselines[i - 1];
      let extraLines = 0;
      if (normalLineSpacing > 0 && gap > 1.2 * normalLineSpacing) {
        extraLines = Math.max(Math.round(gap / normalLineSpacing) - 1, 0);
      }
      for (let e = 0; e < extraLines; e++) {
        lineIndex++;
        ensureLineExists(canvas, lineIndex, canvasWidth);
      }
      lineIndex++;
      ensureLineExists(canvas, lineIndex, canvasWidth);
    }
    const lineAnnotations = finalLines[i];
    for (const annotation of lineAnnotations) {
      const text = annotation.text;
      const startXInChars = Math.round(
        annotation.bottom_left_normalized.x * (pageWidth / HEURISTIC_CHAR_WIDTH)
      );
      for (let j = 0; j < text.length; j++) {
        const xPos = startXInChars + j;
        if (xPos < canvasWidth) {
          canvas[lineIndex][xPos] = text[j];
        }
      }
    }
  }
  canvas = canvas.map((row) => {
    const lineStr = row.join("");
    return Array.from(lineStr.trimEnd());
  });
  let pageText = canvas.map((line) => line.join("")).join("\n");
  pageText = pageText.trimEnd();
  pageText = "-".repeat(canvasWidth) + "\n" + pageText + "\n" + "-".repeat(canvasWidth);
  return pageText;
}
function ensureLineExists(canvas, lineIndex, width) {
  while (lineIndex >= canvas.length) {
    canvas.push(new Array(width).fill(" "));
  }
}
function groupWordsInSentence(lineAnnotations) {
  const groupedAnnotations = [];
  let currentGroup = [];
  for (const annotation of lineAnnotations) {
    if (currentGroup.length === 0) {
      currentGroup.push(annotation);
      continue;
    }
    const padding = 1;
    const lastAnn = currentGroup[currentGroup.length - 1];
    const characterWidth = lastAnn.width / lastAnn.text.length * padding;
    const isWithinHorizontalRange = annotation.bottom_left.x <= lastAnn.bottom_left.x + lastAnn.width + characterWidth;
    if (Math.abs(annotation.height - currentGroup[0].height) <= 4 && isWithinHorizontalRange) {
      currentGroup.push(annotation);
    } else {
      if (currentGroup.length > 0) {
        const groupedAnnotation = createGroupedAnnotation(currentGroup);
        if (groupedAnnotation.text.length > 0) {
          groupedAnnotations.push(groupedAnnotation);
          currentGroup = [annotation];
        }
      }
    }
  }
  if (currentGroup.length > 0) {
    const groupedAnnotation = createGroupedAnnotation(currentGroup);
    groupedAnnotations.push(groupedAnnotation);
  }
  return groupedAnnotations;
}
function createGroupedAnnotation(group) {
  let text = "";
  for (const word of group) {
    if ([".", ",", '"', "'", ":", ";", "!", "?", "{", "}", "\u2019", "\u201D"].includes(
      word.text
    )) {
      text += word.text;
    } else {
      text += text !== "" ? " " + word.text : word.text;
    }
  }
  const isWord = /[a-zA-Z0-9]/.test(text);
  const medianHeight = median(group.map((word) => word.height));
  if (isWord && medianHeight > 25) {
    text = "**" + text + "**";
  }
  return {
    text,
    bottom_left: {
      x: group[0].bottom_left.x,
      y: group[0].bottom_left.y
    },
    bottom_left_normalized: {
      x: group[0].bottom_left_normalized.x,
      y: group[0].bottom_left_normalized.y
    },
    width: group.reduce((sum, a) => sum + a.width, 0),
    height: group[0].height
  };
}
function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  } else {
    return sorted[middle];
  }
}
function logLineToString(logLine) {
  var _a;
  try {
    const timestamp = logLine.timestamp || (/* @__PURE__ */ new Date()).toISOString();
    if ((_a = logLine.auxiliary) == null ? void 0 : _a.error) {
      return `${timestamp}::[stagehand:${logLine.category}] ${logLine.message}
 ${logLine.auxiliary.error.value}
 ${logLine.auxiliary.trace.value}`;
    }
    return `${timestamp}::[stagehand:${logLine.category}] ${logLine.message} ${logLine.auxiliary ? JSON.stringify(logLine.auxiliary) : ""}`;
  } catch (error) {
    console.error(`Error logging line:`, error);
    return "error logging line";
  }
}
function validateZodSchema(schema, data) {
  try {
    schema.parse(data);
    return true;
  } catch (e) {
    return false;
  }
}
function drawObserveOverlay(page, results) {
  return __async(this, null, function* () {
    const xpathList = results.map((result) => result.selector);
    const validXpaths = xpathList.filter((xpath) => xpath !== "xpath=");
    yield page.evaluate((selectors) => {
      selectors.forEach((selector) => {
        let element;
        if (selector.startsWith("xpath=")) {
          const xpath = selector.substring(6);
          element = document.evaluate(
            xpath,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null
          ).singleNodeValue;
        } else {
          element = document.querySelector(selector);
        }
        if (element instanceof HTMLElement) {
          const overlay = document.createElement("div");
          overlay.setAttribute("stagehandObserve", "true");
          const rect = element.getBoundingClientRect();
          overlay.style.position = "absolute";
          overlay.style.left = rect.left + "px";
          overlay.style.top = rect.top + "px";
          overlay.style.width = rect.width + "px";
          overlay.style.height = rect.height + "px";
          overlay.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
          overlay.style.pointerEvents = "none";
          overlay.style.zIndex = "10000";
          document.body.appendChild(overlay);
        }
      });
    }, validXpaths);
  });
}
function clearOverlays(page) {
  return __async(this, null, function* () {
    yield page.evaluate(() => {
      const elements = document.querySelectorAll('[stagehandObserve="true"]');
      elements.forEach((el) => {
        const parent = el.parentNode;
        while (el.firstChild) {
          parent == null ? void 0 : parent.insertBefore(el.firstChild, el);
        }
        parent == null ? void 0 : parent.removeChild(el);
      });
    });
  });
}
function isRunningInBun() {
  return typeof process !== "undefined" && typeof process.versions !== "undefined" && "bun" in process.versions;
}

// types/act.ts
var SupportedPlaywrightAction = /* @__PURE__ */ ((SupportedPlaywrightAction2) => {
  SupportedPlaywrightAction2["CLICK"] = "click";
  SupportedPlaywrightAction2["FILL"] = "fill";
  SupportedPlaywrightAction2["TYPE"] = "type";
  return SupportedPlaywrightAction2;
})(SupportedPlaywrightAction || {});

// lib/handlers/actHandler.ts
var StagehandActHandler = class {
  constructor({
    verbose,
    llmProvider,
    enableCaching,
    logger,
    stagehandPage,
    userProvidedInstructions,
    selfHeal,
    waitForCaptchaSolves
  }) {
    this.verbose = verbose;
    this.llmProvider = llmProvider;
    this.enableCaching = enableCaching;
    this.logger = logger;
    this.actionCache = enableCaching ? new ActionCache(this.logger) : void 0;
    this.actions = {};
    this.stagehandPage = stagehandPage;
    this.userProvidedInstructions = userProvidedInstructions;
    this.selfHeal = selfHeal;
    this.waitForCaptchaSolves = waitForCaptchaSolves;
  }
  /**
   * Perform an immediate Playwright action based on an ObserveResult object
   * that was returned from `page.observe(...)`.
   */
  actFromObserveResult(observe2, domSettleTimeoutMs) {
    return __async(this, null, function* () {
      var _a;
      this.logger({
        category: "action",
        message: "Performing act from an ObserveResult",
        level: 1,
        auxiliary: {
          observeResult: {
            value: JSON.stringify(observe2),
            type: "object"
          }
        }
      });
      const method = observe2.method;
      if (method === "not-supported") {
        this.logger({
          category: "action",
          message: "Cannot execute ObserveResult with unsupported method",
          level: 1,
          auxiliary: {
            error: {
              value: "NotSupportedError: The method requested in this ObserveResult is not supported by Stagehand.",
              type: "string"
            },
            trace: {
              value: `Cannot execute act from ObserveResult with unsupported method: ${method}`,
              type: "string"
            }
          }
        });
        return {
          success: false,
          message: `Unable to perform action: The method '${method}' is not supported in ObserveResult. Please use a supported Playwright locator method.`,
          action: observe2.description || `ObserveResult action (${method})`
        };
      }
      const args = (_a = observe2.arguments) != null ? _a : [];
      const selector = observe2.selector.replace("xpath=", "");
      try {
        yield this._performPlaywrightMethod(
          method,
          args,
          selector,
          domSettleTimeoutMs
        );
        return {
          success: true,
          message: `Action [${method}] performed successfully on selector: ${selector}`,
          action: observe2.description || `ObserveResult action (${method})`
        };
      } catch (err) {
        if (!this.selfHeal || err instanceof PlaywrightCommandMethodNotSupportedException) {
          this.logger({
            category: "action",
            message: "Error performing act from an ObserveResult",
            level: 1,
            auxiliary: {
              error: { value: err.message, type: "string" },
              trace: { value: err.stack, type: "string" }
            }
          });
          return {
            success: false,
            message: `Failed to perform act: ${err.message}`,
            action: observe2.description || `ObserveResult action (${method})`
          };
        }
        this.logger({
          category: "action",
          message: "Error performing act from an ObserveResult. Trying again with regular act method",
          level: 1,
          auxiliary: {
            error: { value: err.message, type: "string" },
            trace: { value: err.stack, type: "string" },
            observeResult: { value: JSON.stringify(observe2), type: "object" }
          }
        });
        try {
          const actCommand = observe2.description.toLowerCase().startsWith(method.toLowerCase()) ? observe2.description : method ? `${method} ${observe2.description}` : observe2.description;
          yield this.stagehandPage.act({
            action: actCommand,
            slowDomBasedAct: true
          });
        } catch (err2) {
          this.logger({
            category: "action",
            message: "Error performing act from an ObserveResult on fallback",
            level: 1,
            auxiliary: {
              error: { value: err2.message, type: "string" },
              trace: { value: err2.stack, type: "string" }
            }
          });
          return {
            success: false,
            message: `Failed to perform act: ${err2.message}`,
            action: observe2.description || `ObserveResult action (${method})`
          };
        }
      }
    });
  }
  /**
   * Perform an act based on an instruction.
   * This method will observe the page and then perform the act on the first element returned.
   */
  observeAct(actionOrOptions) {
    return __async(this, null, function* () {
      let action;
      const observeOptions = {};
      if (typeof actionOrOptions === "object" && actionOrOptions !== null) {
        if (!("action" in actionOrOptions)) {
          throw new Error(
            "Invalid argument. Action options must have an `action` field."
          );
        }
        if (typeof actionOrOptions.action !== "string" || actionOrOptions.action.length === 0) {
          throw new Error("Invalid argument. No action provided.");
        }
        action = actionOrOptions.action;
        if (actionOrOptions.modelName)
          observeOptions.modelName = actionOrOptions.modelName;
        if (actionOrOptions.modelClientOptions)
          observeOptions.modelClientOptions = actionOrOptions.modelClientOptions;
      } else {
        throw new Error(
          "Invalid argument. Valid arguments are: a string, an ActOptions object with an `action` field not empty, or an ObserveResult with a `selector` and `method` field."
        );
      }
      const instruction = buildActObservePrompt(
        action,
        Object.values(SupportedPlaywrightAction),
        actionOrOptions.variables
      );
      const observeResults = yield this.stagehandPage.observe(__spreadValues({
        instruction
      }, observeOptions));
      if (observeResults.length === 0) {
        return {
          success: false,
          message: `Failed to perform act: No observe results found for action`,
          action
        };
      }
      const element = observeResults[0];
      if (actionOrOptions.variables) {
        Object.keys(actionOrOptions.variables).forEach((key) => {
          element.arguments = element.arguments.map(
            (arg) => arg.replace(key, actionOrOptions.variables[key])
          );
        });
      }
      return this.actFromObserveResult(
        element,
        actionOrOptions.domSettleTimeoutMs
      );
    });
  }
  _recordAction(action, result) {
    return __async(this, null, function* () {
      const id = generateId(action);
      this.actions[id] = { result, action };
      return id;
    });
  }
  _verifyActionCompletion(_0) {
    return __async(this, arguments, function* ({
      completed,
      requestId,
      action,
      steps,
      llmClient,
      domSettleTimeoutMs
    }) {
      if (!completed) {
        return false;
      }
      yield this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
      let verifyLLmClient = llmClient;
      if (llmClient.modelName.startsWith("o1") || llmClient.modelName.startsWith("o3")) {
        verifyLLmClient = this.llmProvider.getClient(
          "gpt-4o",
          llmClient.clientOptions
        );
      }
      const { outputString: domElements } = yield this.stagehandPage.page.evaluate(() => {
        return window.processAllOfDom();
      });
      let actionCompleted = false;
      if (completed) {
        this.logger({
          category: "action",
          message: "action marked as completed, verifying if this is true...",
          level: 1,
          auxiliary: {
            action: {
              value: action,
              type: "string"
            }
          }
        });
        actionCompleted = yield verifyActCompletion({
          goal: action,
          steps,
          llmProvider: this.llmProvider,
          llmClient: verifyLLmClient,
          domElements,
          logger: this.logger,
          requestId
        });
        this.logger({
          category: "action",
          message: "action completion verification result",
          level: 1,
          auxiliary: {
            action: {
              value: action,
              type: "string"
            },
            result: {
              value: actionCompleted.toString(),
              type: "boolean"
            }
          }
        });
      }
      return actionCompleted;
    });
  }
  _performPlaywrightMethod(method, args, xpath, domSettleTimeoutMs) {
    return __async(this, null, function* () {
      var _a, _b, _c, _d;
      const locator = this.stagehandPage.page.locator(`xpath=${xpath}`).first();
      const initialUrl = this.stagehandPage.page.url();
      this.logger({
        category: "action",
        message: "performing playwright method",
        level: 2,
        auxiliary: {
          xpath: {
            value: xpath,
            type: "string"
          },
          method: {
            value: method,
            type: "string"
          }
        }
      });
      if (method === "scrollIntoView") {
        this.logger({
          category: "action",
          message: "scrolling element into view",
          level: 2,
          auxiliary: {
            xpath: {
              value: xpath,
              type: "string"
            }
          }
        });
        try {
          yield locator.evaluate((element) => {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }).catch((e) => {
            this.logger({
              category: "action",
              message: "error scrolling element into view",
              level: 1,
              auxiliary: {
                error: {
                  value: e.message,
                  type: "string"
                },
                trace: {
                  value: e.stack,
                  type: "string"
                },
                xpath: {
                  value: xpath,
                  type: "string"
                }
              }
            });
          });
        } catch (e) {
          this.logger({
            category: "action",
            message: "error scrolling element into view",
            level: 1,
            auxiliary: {
              error: {
                value: e.message,
                type: "string"
              },
              trace: {
                value: e.stack,
                type: "string"
              },
              xpath: {
                value: xpath,
                type: "string"
              }
            }
          });
          throw new PlaywrightCommandException(e.message);
        }
      } else if (method === "fill" || method === "type") {
        try {
          yield locator.fill("");
          yield locator.click();
          const text = (_a = args[0]) == null ? void 0 : _a.toString();
          for (const char of text) {
            yield this.stagehandPage.page.keyboard.type(char, {
              delay: Math.random() * 50 + 25
            });
          }
        } catch (e) {
          this.logger({
            category: "action",
            message: "error filling element",
            level: 1,
            auxiliary: {
              error: {
                value: e.message,
                type: "string"
              },
              trace: {
                value: e.stack,
                type: "string"
              },
              xpath: {
                value: xpath,
                type: "string"
              }
            }
          });
          throw new PlaywrightCommandException(e.message);
        }
      } else if (method === "press") {
        try {
          const key = (_b = args[0]) == null ? void 0 : _b.toString();
          yield this.stagehandPage.page.keyboard.press(key);
        } catch (e) {
          this.logger({
            category: "action",
            message: "error pressing key",
            level: 1,
            auxiliary: {
              error: {
                value: e.message,
                type: "string"
              },
              trace: {
                value: e.stack,
                type: "string"
              },
              key: {
                value: (_d = (_c = args[0]) == null ? void 0 : _c.toString()) != null ? _d : "unknown",
                type: "string"
              }
            }
          });
          throw new PlaywrightCommandException(e.message);
        }
      } else if (method === "click") {
        this.logger({
          category: "action",
          message: "page URL before click",
          level: 2,
          auxiliary: {
            url: {
              value: this.stagehandPage.page.url(),
              type: "string"
            }
          }
        });
        try {
          const isRadio = yield locator.evaluate((el) => {
            return el instanceof HTMLInputElement && el.type === "radio";
          });
          const clickArg = args.length ? args[0] : void 0;
          if (isRadio) {
            const inputId = yield locator.evaluate((el) => el.id);
            let labelLocator;
            if (inputId) {
              labelLocator = this.stagehandPage.page.locator(
                `label[for="${inputId}"]`
              );
            }
            if (!labelLocator || (yield labelLocator.count()) < 1) {
              labelLocator = this.stagehandPage.page.locator(`xpath=${xpath}/ancestor::label`).first();
            }
            if ((yield labelLocator.count()) < 1) {
              labelLocator = locator.locator(`xpath=following-sibling::label`).first();
              if ((yield labelLocator.count()) < 1) {
                labelLocator = locator.locator(`xpath=preceding-sibling::label`).first();
              }
            }
            if ((yield labelLocator.count()) > 0) {
              yield labelLocator.click(clickArg);
            } else {
              yield locator.click(clickArg);
            }
          } else {
            const clickArg2 = args.length ? args[0] : void 0;
            yield locator.click(clickArg2);
          }
        } catch (e) {
          this.logger({
            category: "action",
            message: "error performing click",
            level: 1,
            auxiliary: {
              error: {
                value: e.message,
                type: "string"
              },
              trace: {
                value: e.stack,
                type: "string"
              },
              xpath: {
                value: xpath,
                type: "string"
              },
              method: {
                value: method,
                type: "string"
              },
              args: {
                value: JSON.stringify(args),
                type: "object"
              }
            }
          });
          throw new PlaywrightCommandException(e.message);
        }
        this.logger({
          category: "action",
          message: "clicking element, checking for page navigation",
          level: 1,
          auxiliary: {
            xpath: {
              value: xpath,
              type: "string"
            }
          }
        });
        const newOpenedTab = yield Promise.race([
          new Promise((resolve) => {
            this.stagehandPage.context.once("page", (page) => resolve(page));
            setTimeout(() => resolve(null), 1500);
          })
        ]);
        this.logger({
          category: "action",
          message: "clicked element",
          level: 1,
          auxiliary: {
            newOpenedTab: {
              value: newOpenedTab ? "opened a new tab" : "no new tabs opened",
              type: "string"
            }
          }
        });
        if (newOpenedTab) {
          this.logger({
            category: "action",
            message: "new page detected (new tab) with URL",
            level: 1,
            auxiliary: {
              url: {
                value: newOpenedTab.url(),
                type: "string"
              }
            }
          });
          yield newOpenedTab.close();
          yield this.stagehandPage.page.goto(newOpenedTab.url());
          yield this.stagehandPage.page.waitForLoadState("domcontentloaded");
        }
        yield this.stagehandPage._waitForSettledDom(domSettleTimeoutMs).catch((e) => {
          this.logger({
            category: "action",
            message: "wait for settled dom timeout hit",
            level: 1,
            auxiliary: {
              trace: {
                value: e.stack,
                type: "string"
              },
              message: {
                value: e.message,
                type: "string"
              }
            }
          });
        });
        this.logger({
          category: "action",
          message: "finished waiting for (possible) page navigation",
          level: 1
        });
        if (this.stagehandPage.page.url() !== initialUrl) {
          this.logger({
            category: "action",
            message: "new page detected with URL",
            level: 1,
            auxiliary: {
              url: {
                value: this.stagehandPage.page.url(),
                type: "string"
              }
            }
          });
        }
      } else if (typeof locator[method] === "function") {
        this.logger({
          category: "action",
          message: "page URL before action",
          level: 2,
          auxiliary: {
            url: {
              value: this.stagehandPage.page.url(),
              type: "string"
            }
          }
        });
        try {
          yield locator[method](...args.map((arg) => (arg == null ? void 0 : arg.toString()) || ""));
        } catch (e) {
          this.logger({
            category: "action",
            message: "error performing method",
            level: 1,
            auxiliary: {
              error: {
                value: e.message,
                type: "string"
              },
              trace: {
                value: e.stack,
                type: "string"
              },
              xpath: {
                value: xpath,
                type: "string"
              },
              method: {
                value: method,
                type: "string"
              },
              args: {
                value: JSON.stringify(args),
                type: "object"
              }
            }
          });
          throw new PlaywrightCommandException(e.message);
        }
      } else {
        this.logger({
          category: "action",
          message: "chosen method is invalid",
          level: 1,
          auxiliary: {
            method: {
              value: method,
              type: "string"
            }
          }
        });
        throw new PlaywrightCommandMethodNotSupportedException(
          `Method ${method} not supported`
        );
      }
      yield this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
    });
  }
  _getComponentString(locator) {
    return __async(this, null, function* () {
      return yield locator.evaluate((el) => {
        const clone = el.cloneNode(true);
        const attributesToKeep = [
          "type",
          "name",
          "placeholder",
          "aria-label",
          "role",
          "href",
          "title",
          "alt"
        ];
        Array.from(clone.attributes).forEach((attr) => {
          if (!attributesToKeep.includes(attr.name)) {
            clone.removeAttribute(attr.name);
          }
        });
        const outerHtml = clone.outerHTML;
        return outerHtml.trim().replace(/\s+/g, " ");
      });
    });
  }
  act(_0) {
    return __async(this, arguments, function* ({
      action,
      steps = "",
      chunksSeen,
      llmClient,
      retries = 0,
      requestId,
      variables,
      previousSelectors,
      skipActionCacheForThisStep = false,
      domSettleTimeoutMs,
      timeoutMs,
      startTime = Date.now()
    }) {
      var _a, _b;
      try {
        yield this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
        yield this.stagehandPage.startDomDebug();
        if (timeoutMs && startTime) {
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > timeoutMs) {
            return {
              success: false,
              message: `Action timed out after ${timeoutMs}ms`,
              action
            };
          }
        }
        this.logger({
          category: "action",
          message: "running / continuing action",
          level: 2,
          auxiliary: {
            action: {
              value: action,
              type: "string"
            },
            pageUrl: {
              value: this.stagehandPage.page.url(),
              type: "string"
            }
          }
        });
        this.logger({
          category: "action",
          message: "processing DOM",
          level: 2
        });
        const { outputString, selectorMap, chunk, chunks } = yield this.stagehandPage.page.evaluate(
          ({ chunksSeen: chunksSeen2 }) => {
            return window.processDom(chunksSeen2);
          },
          { chunksSeen }
        );
        this.logger({
          category: "action",
          message: "looking at chunk",
          level: 1,
          auxiliary: {
            chunk: {
              value: chunk.toString(),
              type: "integer"
            },
            chunks: {
              value: chunks.length.toString(),
              type: "integer"
            },
            chunksSeen: {
              value: chunksSeen.length.toString(),
              type: "integer"
            },
            chunksLeft: {
              value: (chunks.length - chunksSeen.length).toString(),
              type: "integer"
            }
          }
        });
        const response = yield act({
          action,
          domElements: outputString,
          steps,
          llmClient,
          logger: this.logger,
          requestId,
          variables,
          userProvidedInstructions: this.userProvidedInstructions
        });
        this.logger({
          category: "action",
          message: "received response from LLM",
          level: 1,
          auxiliary: {
            response: {
              value: JSON.stringify(response),
              type: "object"
            }
          }
        });
        yield this.stagehandPage.cleanupDomDebug();
        if (!response) {
          if (chunksSeen.length + 1 < chunks.length) {
            chunksSeen.push(chunk);
            this.logger({
              category: "action",
              message: "no action found in current chunk",
              level: 1,
              auxiliary: {
                chunksSeen: {
                  value: chunksSeen.length.toString(),
                  type: "integer"
                }
              }
            });
            return this.act({
              action,
              steps: steps + (!steps.endsWith("\n") ? "\n" : "") + "## Step: Scrolled to another section\n",
              chunksSeen,
              llmClient,
              requestId,
              variables,
              previousSelectors,
              skipActionCacheForThisStep,
              domSettleTimeoutMs,
              timeoutMs,
              startTime
            });
          } else {
            if (this.enableCaching) {
              this.llmProvider.cleanRequestCache(requestId);
              (_a = this.actionCache) == null ? void 0 : _a.deleteCacheForRequestId(requestId);
            }
            return {
              success: false,
              message: `Action was not able to be completed.`,
              action
            };
          }
        }
        const elementId = response["element"];
        const xpaths = selectorMap[elementId];
        const method = response["method"];
        const args = response["args"];
        const elementLines = outputString.split("\n");
        const elementText = ((_b = elementLines.find((line) => line.startsWith(`${elementId}:`))) == null ? void 0 : _b.split(":")[1]) || "Element not found";
        this.logger({
          category: "action",
          message: "executing method",
          level: 1,
          auxiliary: {
            method: {
              value: method,
              type: "string"
            },
            elementId: {
              value: elementId.toString(),
              type: "integer"
            },
            xpaths: {
              value: JSON.stringify(xpaths),
              type: "object"
            },
            args: {
              value: JSON.stringify(args),
              type: "object"
            }
          }
        });
        try {
          const initialUrl = this.stagehandPage.page.url();
          let foundXpath = null;
          let locator = null;
          for (const xp of xpaths) {
            const candidate = this.stagehandPage.page.locator(`xpath=${xp}`).first();
            try {
              yield candidate.waitFor({ state: "attached", timeout: 2e3 });
              foundXpath = xp;
              locator = candidate;
              break;
            } catch (e) {
              this.logger({
                category: "action",
                message: "XPath not yet located; moving on",
                level: 1,
                auxiliary: {
                  xpath: {
                    value: xp,
                    type: "string"
                  },
                  error: {
                    value: e.message,
                    type: "string"
                  }
                }
              });
            }
          }
          if (!foundXpath || !locator) {
            throw new Error("None of the provided XPaths could be located.");
          }
          const originalUrl = this.stagehandPage.page.url();
          const componentString = yield this._getComponentString(locator);
          const responseArgs = [...args];
          if (variables) {
            responseArgs.forEach((arg, index) => {
              if (typeof arg === "string") {
                args[index] = fillInVariables(arg, variables);
              }
            });
          }
          yield this._performPlaywrightMethod(
            method,
            args,
            foundXpath,
            domSettleTimeoutMs
          );
          const newStepString = (!steps.endsWith("\n") ? "\n" : "") + `## Step: ${response.step}
  Element: ${elementText}
  Action: ${response.method}
  Reasoning: ${response.why}
`;
          steps += newStepString;
          if (this.enableCaching) {
            this.actionCache.addActionStep({
              action,
              url: originalUrl,
              previousSelectors,
              playwrightCommand: {
                method,
                args: responseArgs.map((arg) => (arg == null ? void 0 : arg.toString()) || "")
              },
              componentString,
              requestId,
              xpaths,
              newStepString,
              completed: response.completed
            }).catch((e) => {
              this.logger({
                category: "action",
                message: "error adding action step to cache",
                level: 1,
                auxiliary: {
                  error: {
                    value: e.message,
                    type: "string"
                  },
                  trace: {
                    value: e.stack,
                    type: "string"
                  }
                }
              });
            });
          }
          if (this.stagehandPage.page.url() !== initialUrl) {
            steps += `  Result (Important): Page URL changed from ${initialUrl} to ${this.stagehandPage.page.url()}

`;
            if (this.waitForCaptchaSolves) {
              try {
                yield this.stagehandPage.waitForCaptchaSolve(1e3);
              } catch (e) {
              }
            }
          }
          const actionCompleted = yield this._verifyActionCompletion({
            completed: response.completed,
            requestId,
            action,
            steps,
            llmClient,
            domSettleTimeoutMs
          }).catch((error) => {
            this.logger({
              category: "action",
              message: "error verifying action completion. Assuming action completed.",
              level: 1,
              auxiliary: {
                error: {
                  value: error.message,
                  type: "string"
                },
                trace: {
                  value: error.stack,
                  type: "string"
                }
              }
            });
            return true;
          });
          if (!actionCompleted) {
            this.logger({
              category: "action",
              message: "continuing to next action step",
              level: 1
            });
            return this.act({
              action,
              steps,
              llmClient,
              chunksSeen,
              requestId,
              variables,
              previousSelectors: [...previousSelectors, foundXpath],
              skipActionCacheForThisStep: false,
              domSettleTimeoutMs,
              timeoutMs,
              startTime
            });
          } else {
            this.logger({
              category: "action",
              message: "action completed successfully",
              level: 1
            });
            yield this._recordAction(action, response.step);
            return {
              success: true,
              message: `Action completed successfully: ${steps}${response.step}`,
              action
            };
          }
        } catch (error) {
          this.logger({
            category: "action",
            message: "error performing action - d",
            level: 1,
            auxiliary: {
              error: {
                value: error.message,
                type: "string"
              },
              trace: {
                value: error.stack,
                type: "string"
              },
              retries: {
                value: retries.toString(),
                type: "integer"
              }
            }
          });
          if (retries < 2) {
            return this.act({
              action,
              steps,
              llmClient,
              retries: retries + 1,
              chunksSeen,
              requestId,
              variables,
              previousSelectors,
              skipActionCacheForThisStep,
              domSettleTimeoutMs,
              timeoutMs,
              startTime
            });
          }
          yield this._recordAction(action, "");
          if (this.enableCaching) {
            this.llmProvider.cleanRequestCache(requestId);
            this.actionCache.deleteCacheForRequestId(requestId);
          }
          return {
            success: false,
            message: "error performing action - a",
            action
          };
        }
      } catch (error) {
        this.logger({
          category: "action",
          message: "error performing action - b",
          level: 1,
          auxiliary: {
            error: {
              value: error.message,
              type: "string"
            },
            trace: {
              value: error.stack,
              type: "string"
            }
          }
        });
        if (this.enableCaching) {
          this.llmProvider.cleanRequestCache(requestId);
          this.actionCache.deleteCacheForRequestId(requestId);
        }
        return {
          success: false,
          message: `Error performing action - C: ${error.message}`,
          action
        };
      }
    });
  }
};

// lib/handlers/extractHandler.ts
var PROXIMITY_THRESHOLD = 15;
var StagehandExtractHandler = class {
  constructor({
    stagehand,
    logger,
    stagehandPage,
    userProvidedInstructions
  }) {
    this.stagehand = stagehand;
    this.logger = logger;
    this.stagehandPage = stagehandPage;
    this.userProvidedInstructions = userProvidedInstructions;
  }
  extract() {
    return __async(this, arguments, function* ({
      instruction,
      schema,
      content = {},
      chunksSeen = [],
      llmClient,
      requestId,
      domSettleTimeoutMs,
      useTextExtract = false,
      selector
    } = {}) {
      const noArgsCalled = !instruction && !schema && !llmClient && !selector;
      if (noArgsCalled) {
        this.logger({
          category: "extraction",
          message: "Extracting the entire page text.",
          level: 1
        });
        return this.extractPageText();
      }
      if (useTextExtract) {
        return this.textExtract({
          instruction,
          schema,
          content,
          llmClient,
          requestId,
          domSettleTimeoutMs,
          selector
        });
      } else {
        return this.domExtract({
          instruction,
          schema,
          content,
          chunksSeen,
          llmClient,
          requestId,
          domSettleTimeoutMs
        });
      }
    });
  }
  extractPageText() {
    return __async(this, null, function* () {
      yield this.stagehandPage._waitForSettledDom();
      yield this.stagehandPage.startDomDebug();
      const originalDOM = yield this.stagehandPage.page.evaluate(
        () => window.storeDOM(void 0)
      );
      const { selectorMap } = yield this.stagehand.page.evaluate(
        () => window.processAllOfDom(void 0)
      );
      yield this.stagehand.page.evaluate(
        () => window.createTextBoundingBoxes(void 0)
      );
      const containerDims = yield this.getTargetDimensions();
      const allAnnotations = yield this.collectAllAnnotations(
        selectorMap,
        containerDims.width,
        containerDims.height,
        containerDims.offsetLeft,
        containerDims.offsetTop
      );
      const deduplicatedTextAnnotations = this.deduplicateAnnotations(allAnnotations);
      yield this.stagehandPage.page.evaluate(
        (dom) => window.restoreDOM(dom, void 0),
        originalDOM
      );
      const formattedText = formatText(
        deduplicatedTextAnnotations,
        containerDims.width
      );
      yield this.stagehandPage.cleanupDomDebug();
      const result = { page_text: formattedText };
      return pageTextSchema.parse(result);
    });
  }
  textExtract(_0) {
    return __async(this, arguments, function* ({
      instruction,
      schema,
      content = {},
      llmClient,
      requestId,
      domSettleTimeoutMs,
      selector
    }) {
      var _a;
      this.logger({
        category: "extraction",
        message: "starting extraction",
        level: 1,
        auxiliary: {
          instruction: {
            value: instruction,
            type: "string"
          }
        }
      });
      yield this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
      yield this.stagehandPage.startDomDebug();
      const targetXpath = (_a = selector == null ? void 0 : selector.replace(/^xpath=/, "")) != null ? _a : "";
      const originalDOM = yield this.stagehandPage.page.evaluate(
        (xp) => window.storeDOM(xp),
        targetXpath
      );
      const { selectorMap } = yield this.stagehand.page.evaluate(
        (xp) => window.processAllOfDom(xp),
        targetXpath
      );
      this.logger({
        category: "extraction",
        message: `received output from processAllOfDom. selectorMap has ${Object.keys(selectorMap).length} entries`,
        level: 1
      });
      yield this.stagehand.page.evaluate(
        (xp) => window.createTextBoundingBoxes(xp),
        targetXpath
      );
      const {
        width: containerWidth,
        height: containerHeight,
        offsetLeft = 0,
        offsetTop = 0
      } = yield this.getTargetDimensions(targetXpath);
      const allAnnotations = yield this.collectAllAnnotations(
        selectorMap,
        containerWidth,
        containerHeight,
        offsetLeft,
        offsetTop
      );
      const annotationsGroupedByText = /* @__PURE__ */ new Map();
      for (const annotation of allAnnotations) {
        if (!annotationsGroupedByText.has(annotation.text)) {
          annotationsGroupedByText.set(annotation.text, []);
        }
        annotationsGroupedByText.get(annotation.text).push(annotation);
      }
      const deduplicatedTextAnnotations = [];
      for (const [text, annotations] of annotationsGroupedByText.entries()) {
        for (const annotation of annotations) {
          const isDuplicate = deduplicatedTextAnnotations.some(
            (existingAnnotation) => {
              if (existingAnnotation.text !== text) return false;
              const dx = existingAnnotation.bottom_left.x - annotation.bottom_left.x;
              const dy = existingAnnotation.bottom_left.y - annotation.bottom_left.y;
              const distance = Math.hypot(dx, dy);
              return distance < PROXIMITY_THRESHOLD;
            }
          );
          if (!isDuplicate) {
            deduplicatedTextAnnotations.push(annotation);
          }
        }
      }
      yield this.stagehandPage.page.evaluate(
        ({ dom, xp }) => window.restoreDOM(dom, xp),
        { dom: originalDOM, xp: targetXpath }
      );
      const formattedText = formatText(
        deduplicatedTextAnnotations,
        containerWidth
      );
      const extractionResponse = yield extract({
        instruction,
        previouslyExtractedContent: content,
        domElements: formattedText,
        schema,
        chunksSeen: 1,
        chunksTotal: 1,
        llmClient,
        requestId,
        userProvidedInstructions: this.userProvidedInstructions,
        logger: this.logger
      });
      const _b = extractionResponse, {
        metadata: { completed }
      } = _b, output = __objRest(_b, [
        "metadata"
      ]);
      yield this.stagehandPage.cleanupDomDebug();
      this.logger({
        category: "extraction",
        message: "received extraction response",
        auxiliary: {
          extraction_response: {
            value: JSON.stringify(extractionResponse),
            type: "object"
          }
        }
      });
      if (completed) {
        this.logger({
          category: "extraction",
          message: "extraction completed successfully",
          level: 1,
          auxiliary: {
            extraction_response: {
              value: JSON.stringify(extractionResponse),
              type: "object"
            }
          }
        });
      } else {
        this.logger({
          category: "extraction",
          message: "extraction incomplete after processing all data",
          level: 1,
          auxiliary: {
            extraction_response: {
              value: JSON.stringify(extractionResponse),
              type: "object"
            }
          }
        });
      }
      return output;
    });
  }
  domExtract(_0) {
    return __async(this, arguments, function* ({
      instruction,
      schema,
      content = {},
      chunksSeen = [],
      llmClient,
      requestId,
      domSettleTimeoutMs
    }) {
      this.logger({
        category: "extraction",
        message: "starting extraction using old approach",
        level: 1,
        auxiliary: {
          instruction: {
            value: instruction,
            type: "string"
          }
        }
      });
      yield this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
      yield this.stagehandPage.startDomDebug();
      const { outputString, chunk, chunks } = yield this.stagehand.page.evaluate(
        (chunksSeen2) => window.processDom(chunksSeen2 != null ? chunksSeen2 : []),
        chunksSeen
      );
      this.logger({
        category: "extraction",
        message: "received output from processDom.",
        auxiliary: {
          chunk: {
            value: chunk.toString(),
            type: "integer"
          },
          chunks_left: {
            value: (chunks.length - chunksSeen.length).toString(),
            type: "integer"
          },
          chunks_total: {
            value: chunks.length.toString(),
            type: "integer"
          }
        }
      });
      const extractionResponse = yield extract({
        instruction,
        previouslyExtractedContent: content,
        domElements: outputString,
        schema,
        llmClient,
        chunksSeen: chunksSeen.length,
        chunksTotal: chunks.length,
        requestId,
        isUsingTextExtract: false,
        userProvidedInstructions: this.userProvidedInstructions,
        logger: this.logger
      });
      const _a = extractionResponse, {
        metadata: { completed }
      } = _a, output = __objRest(_a, [
        "metadata"
      ]);
      yield this.stagehandPage.cleanupDomDebug();
      this.logger({
        category: "extraction",
        message: "received extraction response",
        auxiliary: {
          extraction_response: {
            value: JSON.stringify(extractionResponse),
            type: "object"
          }
        }
      });
      chunksSeen.push(chunk);
      if (completed || chunksSeen.length === chunks.length) {
        this.logger({
          category: "extraction",
          message: "got response",
          auxiliary: {
            extraction_response: {
              value: JSON.stringify(extractionResponse),
              type: "object"
            }
          }
        });
        return output;
      } else {
        this.logger({
          category: "extraction",
          message: "continuing extraction",
          auxiliary: {
            extraction_response: {
              value: JSON.stringify(extractionResponse),
              type: "object"
            }
          }
        });
        yield this.stagehandPage._waitForSettledDom(domSettleTimeoutMs);
        return this.domExtract({
          instruction,
          schema,
          content: output,
          chunksSeen,
          llmClient,
          domSettleTimeoutMs
        });
      }
    });
  }
  /**
   * Get the width, height, and offsets of either the entire page or a specific element.
   * (Matches your existing getTargetDimensions logic, just adapted to accept a string | undefined.)
   */
  getTargetDimensions(targetXpath) {
    return __async(this, null, function* () {
      if (!targetXpath) {
        const { innerWidth, innerHeight } = yield this.stagehand.page.evaluate(
          () => ({
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight
          })
        );
        return {
          width: innerWidth,
          height: innerHeight,
          offsetLeft: 0,
          offsetTop: 0
        };
      }
      const { elemWidth, elemHeight, offsetLeft, offsetTop } = yield this.stagehand.page.evaluate((xp) => {
        const el = window.getNodeFromXpath(xp);
        if (!el) {
          return {
            elemWidth: window.innerWidth,
            elemHeight: window.innerHeight,
            offsetLeft: 0,
            offsetTop: 0
          };
        }
        const rect = el.getBoundingClientRect();
        return {
          elemWidth: rect.width,
          elemHeight: rect.height,
          offsetLeft: rect.left,
          offsetTop: rect.top
        };
      }, targetXpath);
      return {
        width: elemWidth,
        height: elemHeight,
        offsetLeft,
        offsetTop
      };
    });
  }
  /**
   * Collects the bounding boxes for each word inside each of the candidate element in selectorMap,
   * adjusting for container offsets, and producing an array of TextAnnotations.
   */
  collectAllAnnotations(selectorMap, containerWidth, containerHeight, offsetLeft, offsetTop) {
    return __async(this, null, function* () {
      const allAnnotations = [];
      for (const xpaths of Object.values(selectorMap)) {
        const xpath = xpaths[0];
        const boundingBoxes = yield this.stagehandPage.page.evaluate(
          (xp) => window.getElementBoundingBoxes(xp),
          xpath
        );
        for (const box of boundingBoxes) {
          const localLeft = box.left - offsetLeft;
          const localTop = box.top - offsetTop;
          const bottom_left = { x: localLeft, y: localTop + box.height };
          const bottom_left_normalized = {
            x: localLeft / containerWidth,
            y: (localTop + box.height) / containerHeight
          };
          if (box.text.trim().length > 0) {
            allAnnotations.push({
              text: box.text,
              bottom_left,
              bottom_left_normalized,
              width: box.width,
              height: box.height
            });
          }
        }
      }
      return allAnnotations;
    });
  }
  /**
   * Deduplicate text annotations by grouping them by text, then removing duplicates
   * within a certain proximity threshold.
   */
  deduplicateAnnotations(annotations) {
    const annotationsGroupedByText = /* @__PURE__ */ new Map();
    const deduplicated = [];
    for (const annotation of annotations) {
      if (!annotationsGroupedByText.has(annotation.text)) {
        annotationsGroupedByText.set(annotation.text, []);
      }
      annotationsGroupedByText.get(annotation.text).push(annotation);
    }
    for (const [text, group] of annotationsGroupedByText.entries()) {
      for (const annotation of group) {
        const isDuplicate = deduplicated.some((existing) => {
          if (existing.text !== text) return false;
          const dx = existing.bottom_left.x - annotation.bottom_left.x;
          const dy = existing.bottom_left.y - annotation.bottom_left.y;
          const distance = Math.hypot(dx, dy);
          return distance < PROXIMITY_THRESHOLD;
        });
        if (!isDuplicate) {
          deduplicated.push(annotation);
        }
      }
    }
    return deduplicated;
  }
};

// lib/a11y/utils.ts
function formatSimplifiedTree(node, level = 0) {
  var _a;
  const indent = "  ".repeat(level);
  let result = `${indent}[${node.nodeId}] ${node.role}${node.name ? `: ${node.name}` : ""}
`;
  if ((_a = node.children) == null ? void 0 : _a.length) {
    result += node.children.map((child) => formatSimplifiedTree(child, level + 1)).join("");
  }
  return result;
}
function cleanStructuralNodes(node, page, logger) {
  return __async(this, null, function* () {
    if (node.nodeId && parseInt(node.nodeId) < 0) {
      return null;
    }
    if (!node.children || node.children.length === 0) {
      return node.role === "generic" || node.role === "none" ? null : node;
    }
    const cleanedChildrenPromises = node.children.map(
      (child) => cleanStructuralNodes(child, page, logger)
    );
    const resolvedChildren = yield Promise.all(cleanedChildrenPromises);
    const cleanedChildren = resolvedChildren.filter(
      (child) => child !== null
    );
    if (node.role === "generic" || node.role === "none") {
      if (cleanedChildren.length === 1) {
        return cleanedChildren[0];
      } else if (cleanedChildren.length === 0) {
        return null;
      }
    }
    if (page && logger && node.backendDOMNodeId !== void 0 && (node.role === "generic" || node.role === "none")) {
      try {
        const { object } = yield page.sendCDP("DOM.resolveNode", {
          backendNodeId: node.backendDOMNodeId
        });
        if (object && object.objectId) {
          try {
            const { result } = yield page.sendCDP("Runtime.callFunctionOn", {
              objectId: object.objectId,
              functionDeclaration: `
              function() {
                return this.tagName ? this.tagName.toLowerCase() : "";
              }
            `,
              returnByValue: true
            });
            if (result == null ? void 0 : result.value) {
              node.role = result.value;
            }
          } catch (tagNameError) {
            logger({
              category: "observation",
              message: `Could not fetch tagName for node ${node.backendDOMNodeId}`,
              level: 2,
              auxiliary: {
                error: {
                  value: tagNameError.message,
                  type: "string"
                }
              }
            });
          }
        }
      } catch (resolveError) {
        logger({
          category: "observation",
          message: `Could not resolve DOM node ID ${node.backendDOMNodeId}`,
          level: 2,
          auxiliary: {
            error: {
              value: resolveError.message,
              type: "string"
            }
          }
        });
      }
    }
    return cleanedChildren.length > 0 ? __spreadProps(__spreadValues({}, node), { children: cleanedChildren }) : node;
  });
}
function buildHierarchicalTree(nodes, page, logger) {
  return __async(this, null, function* () {
    const nodeMap = /* @__PURE__ */ new Map();
    const iframe_list = [];
    nodes.forEach((node) => {
      const nodeIdValue = parseInt(node.nodeId, 10);
      if (nodeIdValue < 0) {
        return;
      }
      const hasChildren = node.childIds && node.childIds.length > 0;
      const hasValidName = node.name && node.name.trim() !== "";
      const isInteractive = node.role !== "none" && node.role !== "generic" && node.role !== "InlineTextBox";
      if (!hasValidName && !hasChildren && !isInteractive) {
        return;
      }
      nodeMap.set(node.nodeId, __spreadValues(__spreadValues(__spreadValues(__spreadValues({
        role: node.role,
        nodeId: node.nodeId
      }, hasValidName && { name: node.name }), node.description && { description: node.description }), node.value && { value: node.value }), node.backendDOMNodeId !== void 0 && {
        backendDOMNodeId: node.backendDOMNodeId
      }));
    });
    nodes.forEach((node) => {
      const isIframe = node.role === "Iframe";
      if (isIframe) {
        const iframeNode = {
          role: node.role,
          nodeId: node.nodeId
        };
        iframe_list.push(iframeNode);
      }
      if (node.parentId && nodeMap.has(node.nodeId)) {
        const parentNode = nodeMap.get(node.parentId);
        const currentNode = nodeMap.get(node.nodeId);
        if (parentNode && currentNode) {
          if (!parentNode.children) {
            parentNode.children = [];
          }
          parentNode.children.push(currentNode);
        }
      }
    });
    const rootNodes = nodes.filter((node) => !node.parentId && nodeMap.has(node.nodeId)).map((node) => nodeMap.get(node.nodeId)).filter(Boolean);
    const cleanedTreePromises = rootNodes.map(
      (node) => cleanStructuralNodes(node, page, logger)
    );
    const finalTree = (yield Promise.all(cleanedTreePromises)).filter(
      Boolean
    );
    const simplifiedFormat = finalTree.map((node) => formatSimplifiedTree(node)).join("\n");
    return {
      tree: finalTree,
      simplified: simplifiedFormat,
      iframes: iframe_list
    };
  });
}
function getAccessibilityTree(page, logger) {
  return __async(this, null, function* () {
    yield page.enableCDP("Accessibility");
    try {
      const scrollableBackendIds = yield findScrollableElementIds(page);
      const { nodes } = yield page.sendCDP(
        "Accessibility.getFullAXTree"
      );
      const startTime = Date.now();
      const hierarchicalTree = yield buildHierarchicalTree(
        nodes.map((node) => {
          var _a, _b, _c, _d;
          let roleValue = ((_a = node.role) == null ? void 0 : _a.value) || "";
          if (scrollableBackendIds.has(node.backendDOMNodeId)) {
            if (roleValue === "generic" || roleValue === "none") {
              roleValue = "scrollable";
            } else {
              roleValue = roleValue ? `scrollable, ${roleValue}` : "scrollable";
            }
          }
          return {
            role: roleValue,
            name: (_b = node.name) == null ? void 0 : _b.value,
            description: (_c = node.description) == null ? void 0 : _c.value,
            value: (_d = node.value) == null ? void 0 : _d.value,
            nodeId: node.nodeId,
            backendDOMNodeId: node.backendDOMNodeId,
            parentId: node.parentId,
            childIds: node.childIds
          };
        }),
        page,
        logger
      );
      logger({
        category: "observation",
        message: `got accessibility tree in ${Date.now() - startTime}ms`,
        level: 1
      });
      return hierarchicalTree;
    } catch (error) {
      logger({
        category: "observation",
        message: "Error getting accessibility tree",
        level: 1,
        auxiliary: {
          error: {
            value: error.message,
            type: "string"
          },
          trace: {
            value: error.stack,
            type: "string"
          }
        }
      });
      throw error;
    } finally {
      yield page.disableCDP("Accessibility");
    }
  });
}
var functionString = `
function getNodePath(el) {
  if (!el || (el.nodeType !== Node.ELEMENT_NODE && el.nodeType !== Node.TEXT_NODE)) {
    console.log("el is not a valid node type");
    return "";
  }

  const parts = [];
  let current = el;

  while (current && (current.nodeType === Node.ELEMENT_NODE || current.nodeType === Node.TEXT_NODE)) {
    let index = 0;
    let hasSameTypeSiblings = false;
    const siblings = current.parentElement
      ? Array.from(current.parentElement.childNodes)
      : [];

    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (
        sibling.nodeType === current.nodeType &&
        sibling.nodeName === current.nodeName
      ) {
        index = index + 1;
        hasSameTypeSiblings = true;
        if (sibling.isSameNode(current)) {
          break;
        }
      }
    }

    if (!current || !current.parentNode) break;
    if (current.nodeName.toLowerCase() === "html"){
      parts.unshift("html");
      break;
    }

    // text nodes are handled differently in XPath
    if (current.nodeName !== "#text") {
      const tagName = current.nodeName.toLowerCase();
      const pathIndex = hasSameTypeSiblings ? \`[\${index}]\` : "";
      parts.unshift(\`\${tagName}\${pathIndex}\`);
    }
    
    current = current.parentElement;
  }

  return parts.length ? \`/\${parts.join("/")}\` : "";
}`;
function getXPathByResolvedObjectId(cdpClient, resolvedObjectId) {
  return __async(this, null, function* () {
    const { result } = yield cdpClient.send("Runtime.callFunctionOn", {
      objectId: resolvedObjectId,
      functionDeclaration: `function() {
      ${functionString}
      return getNodePath(this);
    }`,
      returnByValue: true
    });
    return result.value || "";
  });
}
function findScrollableElementIds(stagehandPage) {
  return __async(this, null, function* () {
    const xpaths = yield stagehandPage.page.evaluate(() => {
      return window.getScrollableElementXpaths();
    });
    const scrollableBackendIds = /* @__PURE__ */ new Set();
    for (const xpath of xpaths) {
      if (!xpath) continue;
      const { result } = yield stagehandPage.sendCDP("Runtime.evaluate", {
        expression: `
        (function() {
          const res = document.evaluate(${JSON.stringify(
          xpath
        )}, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          return res.singleNodeValue;
        })();
      `,
        returnByValue: false
      });
      if (result == null ? void 0 : result.objectId) {
        const { node } = yield stagehandPage.sendCDP("DOM.describeNode", {
          objectId: result.objectId
        });
        if (node == null ? void 0 : node.backendNodeId) {
          scrollableBackendIds.add(node.backendNodeId);
        }
      }
    }
    return scrollableBackendIds;
  });
}

// lib/handlers/observeHandler.ts
var StagehandObserveHandler = class {
  constructor({
    stagehand,
    logger,
    stagehandPage,
    userProvidedInstructions
  }) {
    this.stagehand = stagehand;
    this.logger = logger;
    this.stagehandPage = stagehandPage;
    this.userProvidedInstructions = userProvidedInstructions;
    this.observations = {};
  }
  _recordObservation(instruction, result) {
    return __async(this, null, function* () {
      const id = generateId(instruction);
      this.observations[id] = { result, instruction };
      return id;
    });
  }
  observe(_0) {
    return __async(this, arguments, function* ({
      instruction,
      llmClient,
      requestId,
      returnAction,
      onlyVisible,
      drawOverlay
    }) {
      if (!instruction) {
        instruction = `Find elements that can be used for any future actions in the page. These may be navigation links, related pages, section/subsection links, buttons, or other interactive elements. Be comprehensive: if there are multiple elements that may be relevant for future actions, return all of them.`;
      }
      this.logger({
        category: "observation",
        message: "starting observation",
        level: 1,
        auxiliary: {
          instruction: {
            value: instruction,
            type: "string"
          }
        }
      });
      let selectorMap = {};
      let outputString;
      let iframes = [];
      const useAccessibilityTree = !onlyVisible;
      if (useAccessibilityTree) {
        yield this.stagehandPage._waitForSettledDom();
        const tree = yield getAccessibilityTree(this.stagehandPage, this.logger);
        this.logger({
          category: "observation",
          message: "Getting accessibility tree data",
          level: 1
        });
        outputString = tree.simplified;
        iframes = tree.iframes;
      } else {
        const evalResult = yield this.stagehand.page.evaluate(() => {
          return window.processAllOfDom().then((result) => result);
        });
        ({ outputString, selectorMap } = evalResult);
      }
      const observationResponse = yield observe({
        instruction,
        domElements: outputString,
        llmClient,
        requestId,
        userProvidedInstructions: this.userProvidedInstructions,
        logger: this.logger,
        isUsingAccessibilityTree: useAccessibilityTree,
        returnAction
      });
      if (iframes.length > 0) {
        iframes.forEach((iframe) => {
          observationResponse.elements.push({
            elementId: Number(iframe.nodeId),
            description: "an iframe",
            method: "not-supported",
            arguments: []
          });
        });
      }
      const elementsWithSelectors = yield Promise.all(
        observationResponse.elements.map((element) => __async(this, null, function* () {
          const _a = element, { elementId } = _a, rest = __objRest(_a, ["elementId"]);
          if (useAccessibilityTree) {
            this.logger({
              category: "observation",
              message: "Getting xpath for element",
              level: 1,
              auxiliary: {
                elementId: {
                  value: elementId.toString(),
                  type: "string"
                }
              }
            });
            const args = { backendNodeId: elementId };
            const { object } = yield this.stagehandPage.sendCDP("DOM.resolveNode", args);
            if (!object || !object.objectId) {
              this.logger({
                category: "observation",
                message: `Invalid object ID returned for element: ${elementId}`,
                level: 1
              });
            }
            const xpath = yield getXPathByResolvedObjectId(
              yield this.stagehandPage.getCDPClient(),
              object.objectId
            );
            if (!xpath || xpath === "") {
              this.logger({
                category: "observation",
                message: `Empty xpath returned for element: ${elementId}`,
                level: 1
              });
            }
            return __spreadProps(__spreadValues({}, rest), {
              selector: `xpath=${xpath}`
              // Provisioning or future use if we want to use direct CDP
              // backendNodeId: elementId,
            });
          }
          return __spreadProps(__spreadValues({}, rest), {
            selector: `xpath=${selectorMap[elementId][0]}`
            // backendNodeId: backendNodeIdMap[elementId],
          });
        }))
      );
      yield this.stagehandPage.cleanupDomDebug();
      this.logger({
        category: "observation",
        message: "found elements",
        level: 1,
        auxiliary: {
          elements: {
            value: JSON.stringify(elementsWithSelectors),
            type: "object"
          }
        }
      });
      if (drawOverlay) {
        yield drawObserveOverlay(this.stagehandPage.page, elementsWithSelectors);
      }
      yield this._recordObservation(instruction, elementsWithSelectors);
      return elementsWithSelectors;
    });
  }
};

// lib/StagehandPage.ts
var BROWSERBASE_REGION_DOMAIN = {
  "us-west-2": "wss://connect.usw2.browserbase.com",
  "us-east-1": "wss://connect.use1.browserbase.com",
  "eu-central-1": "wss://connect.euc1.browserbase.com",
  "ap-southeast-1": "wss://connect.apse1.browserbase.com"
};
var StagehandPage = class _StagehandPage {
  constructor(page, stagehand, context, llmClient, userProvidedInstructions, api, waitForCaptchaSolves) {
    this.cdpClient = null;
    this.initialized = false;
    this.intPage = new Proxy(page, {
      get: (target, prop) => {
        if (!this.initialized && (prop === "act" || prop === "extract" || prop === "observe" || prop === "on")) {
          return () => {
            throw new Error(
              `You seem to be calling \`${String(prop)}\` on a page in an uninitialized \`Stagehand\` object. Ensure you are running \`await stagehand.init()\` on the Stagehand object before referencing the \`page\` object.`
            );
          };
        }
        const value = target[prop];
        if (typeof value === "function" && prop !== "on") {
          return (...args) => {
            this.intContext.setActivePage(this);
            return value.apply(target, args);
          };
        }
        return value;
      }
    });
    this.stagehand = stagehand;
    this.intContext = context;
    this.llmClient = llmClient;
    this.api = api;
    this.userProvidedInstructions = userProvidedInstructions;
    this.waitForCaptchaSolves = waitForCaptchaSolves != null ? waitForCaptchaSolves : false;
    if (this.llmClient) {
      this.actHandler = new StagehandActHandler({
        verbose: this.stagehand.verbose,
        llmProvider: this.stagehand.llmProvider,
        enableCaching: this.stagehand.enableCaching,
        logger: this.stagehand.logger,
        stagehandPage: this,
        stagehandContext: this.intContext,
        llmClient,
        userProvidedInstructions,
        selfHeal: this.stagehand.selfHeal,
        waitForCaptchaSolves: this.waitForCaptchaSolves
      });
      this.extractHandler = new StagehandExtractHandler({
        stagehand: this.stagehand,
        logger: this.stagehand.logger,
        stagehandPage: this,
        userProvidedInstructions
      });
      this.observeHandler = new StagehandObserveHandler({
        stagehand: this.stagehand,
        logger: this.stagehand.logger,
        stagehandPage: this,
        userProvidedInstructions
      });
    }
  }
  _refreshPageFromAPI() {
    return __async(this, null, function* () {
      if (!this.api) return;
      const sessionId = this.stagehand.browserbaseSessionID;
      if (!sessionId) {
        throw new Error("No Browserbase session ID found");
      }
      const browserbase = new import_sdk.Browserbase({
        apiKey: process.env.BROWSERBASE_API_KEY
      });
      const sessionStatus = yield browserbase.sessions.retrieve(sessionId);
      const browserbaseDomain = BROWSERBASE_REGION_DOMAIN[sessionStatus.region] || "wss://connect.browserbase.com";
      const connectUrl = `${browserbaseDomain}?apiKey=${process.env.BROWSERBASE_API_KEY}&sessionId=${sessionId}`;
      const browser = yield import_test.chromium.connectOverCDP(connectUrl);
      const context = browser.contexts()[0];
      const newPage = context.pages()[0];
      const newStagehandPage = yield new _StagehandPage(
        newPage,
        this.stagehand,
        this.intContext,
        this.llmClient,
        this.userProvidedInstructions,
        this.api
      ).init();
      this.intPage = newStagehandPage.page;
      if (this.stagehand.debugDom) {
        yield this.intPage.evaluate(
          (debugDom) => window.showChunks = debugDom,
          this.stagehand.debugDom
        );
      }
      yield this.intPage.waitForLoadState("domcontentloaded");
      yield this._waitForSettledDom();
    });
  }
  /**
   * Waits for a captcha to be solved when using Browserbase environment.
   *
   * @param timeoutMs - Optional timeout in milliseconds. If provided, the promise will reject if the captcha solving hasn't started within the given time.
   * @throws Error if called in a LOCAL environment
   * @throws Error if the timeout is reached before captcha solving starts
   * @returns Promise that resolves when the captcha is solved
   */
  waitForCaptchaSolve(timeoutMs) {
    return __async(this, null, function* () {
      if (this.stagehand.env === "LOCAL") {
        throw new Error(
          "The waitForCaptcha method may only be used when using the Browserbase environment."
        );
      }
      this.stagehand.log({
        category: "captcha",
        message: "Waiting for captcha",
        level: 1
      });
      return new Promise((resolve, reject) => {
        let started = false;
        let timeoutId;
        if (timeoutMs) {
          timeoutId = setTimeout(() => {
            if (!started) {
              reject(new Error("Captcha timeout"));
            }
          }, timeoutMs);
        }
        this.intPage.on("console", (msg) => {
          if (msg.text() === "browserbase-solving-finished") {
            this.stagehand.log({
              category: "captcha",
              message: "Captcha solving finished",
              level: 1
            });
            if (timeoutId) clearTimeout(timeoutId);
            resolve();
          } else if (msg.text() === "browserbase-solving-started") {
            started = true;
            this.stagehand.log({
              category: "captcha",
              message: "Captcha solving started",
              level: 1
            });
          }
        });
      });
    });
  }
  init() {
    return __async(this, null, function* () {
      const page = this.intPage;
      const stagehand = this.stagehand;
      const handler = {
        get: (target, prop) => {
          const value = target[prop];
          if (prop === "act" || prop === "extract" || prop === "observe") {
            if (!this.llmClient) {
              return () => {
                throw new Error(
                  "No LLM API key or LLM Client configured. An LLM API key or a custom LLM Client is required to use act, extract, or observe."
                );
              };
            }
            const method = this[prop];
            return (options) => __async(this, null, function* () {
              this.intContext.setActivePage(this);
              return method.call(this, options);
            });
          }
          if (prop === "goto") {
            return (url, options) => __async(this, null, function* () {
              this.intContext.setActivePage(this);
              const result = this.api ? yield this.api.goto(url, options) : yield target.goto(url, options);
              if (this.waitForCaptchaSolves) {
                try {
                  yield this.waitForCaptchaSolve(1e3);
                } catch (e) {
                }
              }
              if (this.api) {
                yield this._refreshPageFromAPI();
              } else {
                if (stagehand.debugDom) {
                  yield target.evaluate(
                    (debugDom) => window.showChunks = debugDom,
                    stagehand.debugDom
                  );
                }
                yield target.waitForLoadState("domcontentloaded");
                yield this._waitForSettledDom();
              }
              return result;
            });
          }
          if (prop === "on") {
            return (event, listener) => {
              if (event === "popup") {
                return this.context.on("page", (page2) => __async(this, null, function* () {
                  const newContext = yield StagehandContext.init(
                    page2.context(),
                    stagehand
                  );
                  const newStagehandPage = new _StagehandPage(
                    page2,
                    stagehand,
                    newContext,
                    this.llmClient
                  );
                  yield newStagehandPage.init();
                  listener(newStagehandPage.page);
                }));
              }
              this.intContext.setActivePage(this);
              return target.on(event, listener);
            };
          }
          if (typeof value === "function") {
            return (...args) => {
              this.intContext.setActivePage(this);
              return value.apply(target, args);
            };
          }
          return value;
        }
      };
      this.intPage = new Proxy(page, handler);
      this.initialized = true;
      return this;
    });
  }
  get page() {
    return this.intPage;
  }
  get context() {
    return this.intContext.context;
  }
  // We can make methods public because StagehandPage is private to the Stagehand class.
  // When a user gets stagehand.page, they are getting a proxy to the Playwright page.
  // We can override the methods on the proxy to add our own behavior
  _waitForSettledDom(timeoutMs) {
    return __async(this, null, function* () {
      try {
        const timeout = timeoutMs != null ? timeoutMs : this.stagehand.domSettleTimeoutMs;
        let timeoutHandle;
        yield this.page.waitForLoadState("domcontentloaded");
        const timeoutPromise = new Promise((resolve) => {
          timeoutHandle = setTimeout(() => {
            this.stagehand.log({
              category: "dom",
              message: "DOM settle timeout exceeded, continuing anyway",
              level: 1,
              auxiliary: {
                timeout_ms: {
                  value: timeout.toString(),
                  type: "integer"
                }
              }
            });
            resolve();
          }, timeout);
        });
        try {
          yield Promise.race([
            this.page.evaluate(() => {
              return new Promise((resolve) => {
                if (typeof window.waitForDomSettle === "function") {
                  window.waitForDomSettle().then(resolve);
                } else {
                  console.warn(
                    "waitForDomSettle is not defined, considering DOM as settled"
                  );
                  resolve();
                }
              });
            }),
            this.page.waitForLoadState("domcontentloaded"),
            this.page.waitForSelector("body"),
            timeoutPromise
          ]);
        } finally {
          clearTimeout(timeoutHandle);
        }
      } catch (e) {
        this.stagehand.log({
          category: "dom",
          message: "Error in waitForSettledDom",
          level: 1,
          auxiliary: {
            error: {
              value: e.message,
              type: "string"
            },
            trace: {
              value: e.stack,
              type: "string"
            }
          }
        });
      }
    });
  }
  startDomDebug() {
    return __async(this, null, function* () {
      if (this.stagehand.debugDom) {
        try {
          yield this.page.evaluate(() => {
            if (typeof window.debugDom === "function") {
              window.debugDom();
            } else {
              this.stagehand.log({
                category: "dom",
                message: "debugDom is not defined",
                level: 1
              });
            }
          }).catch(() => {
          });
        } catch (e) {
          this.stagehand.log({
            category: "dom",
            message: "Error in startDomDebug",
            level: 1,
            auxiliary: {
              error: {
                value: e.message,
                type: "string"
              },
              trace: {
                value: e.stack,
                type: "string"
              }
            }
          });
        }
      }
    });
  }
  cleanupDomDebug() {
    return __async(this, null, function* () {
      if (this.stagehand.debugDom) {
        yield this.page.evaluate(() => window.cleanupDebug()).catch(() => {
        });
      }
    });
  }
  act(actionOrOptions) {
    return __async(this, null, function* () {
      if (!this.actHandler) {
        throw new Error("Act handler not initialized");
      }
      yield clearOverlays(this.page);
      if (typeof actionOrOptions === "object" && actionOrOptions !== null) {
        if ("selector" in actionOrOptions && "method" in actionOrOptions) {
          const observeResult = actionOrOptions;
          return this.actHandler.actFromObserveResult(observeResult);
        } else {
          if (!("action" in actionOrOptions)) {
            throw new Error(
              "Invalid argument. Valid arguments are: a string, an ActOptions object, or an ObserveResult WITH 'selector' and 'method' fields."
            );
          }
        }
      } else if (typeof actionOrOptions === "string") {
        actionOrOptions = { action: actionOrOptions };
      } else {
        throw new Error(
          "Invalid argument: you may have called act with an empty ObserveResult.\nValid arguments are: a string, an ActOptions object, or an ObserveResult WITH 'selector' and 'method' fields."
        );
      }
      const {
        action,
        modelName,
        modelClientOptions,
        useVision,
        // still destructure this but will not pass it on
        variables = {},
        domSettleTimeoutMs,
        slowDomBasedAct = true,
        timeoutMs = this.stagehand.actTimeoutMs
      } = actionOrOptions;
      if (typeof useVision !== "undefined") {
        this.stagehand.log({
          category: "deprecation",
          message: "Warning: vision is not supported in this version of Stagehand",
          level: 1
        });
      }
      if (this.api) {
        const result = yield this.api.act(actionOrOptions);
        yield this._refreshPageFromAPI();
        return result;
      }
      const requestId = Math.random().toString(36).substring(2);
      const llmClient = modelName ? this.stagehand.llmProvider.getClient(modelName, modelClientOptions) : this.llmClient;
      if (!slowDomBasedAct) {
        return this.actHandler.observeAct(actionOrOptions);
      }
      this.stagehand.log({
        category: "act",
        message: "running act",
        level: 1,
        auxiliary: {
          action: {
            value: action,
            type: "string"
          },
          requestId: {
            value: requestId,
            type: "string"
          },
          modelName: {
            value: llmClient.modelName,
            type: "string"
          }
        }
      });
      return this.actHandler.act({
        action,
        llmClient,
        chunksSeen: [],
        requestId,
        variables,
        previousSelectors: [],
        skipActionCacheForThisStep: false,
        domSettleTimeoutMs,
        timeoutMs
      }).catch((e) => {
        this.stagehand.log({
          category: "act",
          message: "error acting",
          level: 1,
          auxiliary: {
            error: {
              value: e.message,
              type: "string"
            },
            trace: {
              value: e.stack,
              type: "string"
            }
          }
        });
        return {
          success: false,
          message: `Internal error: Error acting: ${e.message}`,
          action
        };
      });
    });
  }
  extract(instructionOrOptions) {
    return __async(this, null, function* () {
      if (!this.extractHandler) {
        throw new Error("Extract handler not initialized");
      }
      yield clearOverlays(this.page);
      if (!instructionOrOptions) {
        return this.extractHandler.extract();
      }
      const options = typeof instructionOrOptions === "string" ? {
        instruction: instructionOrOptions,
        schema: defaultExtractSchema
      } : instructionOrOptions;
      const {
        instruction,
        schema,
        modelName,
        modelClientOptions,
        domSettleTimeoutMs,
        useTextExtract,
        selector
      } = options;
      if (selector && useTextExtract !== true) {
        throw new Error(
          "NotImplementedError: Passing an xpath into extract is only supported when `useTextExtract: true`."
        );
      }
      if (this.api) {
        return this.api.extract(options);
      }
      const requestId = Math.random().toString(36).substring(2);
      const llmClient = modelName ? this.stagehand.llmProvider.getClient(modelName, modelClientOptions) : this.llmClient;
      this.stagehand.log({
        category: "extract",
        message: "running extract",
        level: 1,
        auxiliary: {
          instruction: {
            value: instruction,
            type: "string"
          },
          requestId: {
            value: requestId,
            type: "string"
          },
          modelName: {
            value: llmClient.modelName,
            type: "string"
          }
        }
      });
      return this.extractHandler.extract({
        instruction,
        schema,
        llmClient,
        requestId,
        domSettleTimeoutMs,
        useTextExtract,
        selector
      }).catch((e) => {
        this.stagehand.log({
          category: "extract",
          message: "error extracting",
          level: 1,
          auxiliary: {
            error: {
              value: e.message,
              type: "string"
            },
            trace: {
              value: e.stack,
              type: "string"
            }
          }
        });
        if (this.stagehand.enableCaching) {
          this.stagehand.llmProvider.cleanRequestCache(requestId);
        }
        throw e;
      });
    });
  }
  observe(instructionOrOptions) {
    return __async(this, null, function* () {
      if (!this.observeHandler) {
        throw new Error("Observe handler not initialized");
      }
      yield clearOverlays(this.page);
      const options = typeof instructionOrOptions === "string" ? { instruction: instructionOrOptions } : instructionOrOptions || {};
      const {
        instruction,
        modelName,
        modelClientOptions,
        useVision,
        // still destructure but will not pass it on
        domSettleTimeoutMs,
        returnAction = true,
        onlyVisible = false,
        useAccessibilityTree,
        drawOverlay
      } = options;
      if (useAccessibilityTree !== void 0) {
        this.stagehand.log({
          category: "deprecation",
          message: "useAccessibilityTree is deprecated.\n  To use accessibility tree as context:\n    1. Set onlyVisible to false (default)\n    2. Don't declare useAccessibilityTree",
          level: 1
        });
        throw new Error(
          "useAccessibilityTree is deprecated. Use onlyVisible instead."
        );
      }
      if (typeof useVision !== "undefined") {
        this.stagehand.log({
          category: "deprecation",
          message: "Warning: vision is not supported in this version of Stagehand",
          level: 1
        });
      }
      if (this.api) {
        return this.api.observe(options);
      }
      const requestId = Math.random().toString(36).substring(2);
      const llmClient = modelName ? this.stagehand.llmProvider.getClient(modelName, modelClientOptions) : this.llmClient;
      this.stagehand.log({
        category: "observe",
        message: "running observe",
        level: 1,
        auxiliary: {
          instruction: {
            value: instruction,
            type: "string"
          },
          requestId: {
            value: requestId,
            type: "string"
          },
          modelName: {
            value: llmClient.modelName,
            type: "string"
          },
          onlyVisible: {
            value: onlyVisible ? "true" : "false",
            type: "boolean"
          }
        }
      });
      return this.observeHandler.observe({
        instruction,
        llmClient,
        requestId,
        domSettleTimeoutMs,
        returnAction,
        onlyVisible,
        drawOverlay
      }).catch((e) => {
        this.stagehand.log({
          category: "observe",
          message: "error observing",
          level: 1,
          auxiliary: {
            error: {
              value: e.message,
              type: "string"
            },
            trace: {
              value: e.stack,
              type: "string"
            },
            requestId: {
              value: requestId,
              type: "string"
            },
            instruction: {
              value: instruction,
              type: "string"
            }
          }
        });
        if (this.stagehand.enableCaching) {
          this.stagehand.llmProvider.cleanRequestCache(requestId);
        }
        throw e;
      });
    });
  }
  getCDPClient() {
    return __async(this, null, function* () {
      if (!this.cdpClient) {
        this.cdpClient = yield this.context.newCDPSession(this.page);
      }
      return this.cdpClient;
    });
  }
  sendCDP(command, args) {
    return __async(this, null, function* () {
      const client = yield this.getCDPClient();
      return client.send(
        command,
        args || {}
      );
    });
  }
  enableCDP(domain) {
    return __async(this, null, function* () {
      yield this.sendCDP(`${domain}.enable`, {});
    });
  }
  disableCDP(domain) {
    return __async(this, null, function* () {
      yield this.sendCDP(`${domain}.disable`, {});
    });
  }
};

// lib/StagehandContext.ts
var StagehandContext = class _StagehandContext {
  constructor(context, stagehand) {
    this.activeStagehandPage = null;
    this.stagehand = stagehand;
    this.pageMap = /* @__PURE__ */ new WeakMap();
    this.intContext = new Proxy(context, {
      get: (target, prop) => {
        if (prop === "newPage") {
          return () => __async(this, null, function* () {
            const pwPage = yield target.newPage();
            const stagehandPage = yield this.createStagehandPage(pwPage);
            this.setActivePage(stagehandPage);
            return stagehandPage.page;
          });
        }
        if (prop === "pages") {
          return () => {
            const pwPages = target.pages();
            return pwPages.map((pwPage) => {
              let stagehandPage = this.pageMap.get(pwPage);
              if (!stagehandPage) {
                stagehandPage = new StagehandPage(
                  pwPage,
                  this.stagehand,
                  this,
                  this.stagehand.llmClient,
                  this.stagehand.userProvidedInstructions,
                  this.stagehand.apiClient,
                  this.stagehand.waitForCaptchaSolves
                );
                this.pageMap.set(pwPage, stagehandPage);
              }
              return stagehandPage.page;
            });
          };
        }
        return target[prop];
      }
    });
  }
  createStagehandPage(page) {
    return __async(this, null, function* () {
      const stagehandPage = yield new StagehandPage(
        page,
        this.stagehand,
        this,
        this.stagehand.llmClient,
        this.stagehand.userProvidedInstructions,
        this.stagehand.apiClient,
        this.stagehand.waitForCaptchaSolves
      ).init();
      this.pageMap.set(page, stagehandPage);
      return stagehandPage;
    });
  }
  static init(context, stagehand) {
    return __async(this, null, function* () {
      const instance = new _StagehandContext(context, stagehand);
      const existingPages = context.pages();
      for (const page of existingPages) {
        const stagehandPage = yield instance.createStagehandPage(page);
        if (!instance.activeStagehandPage) {
          instance.setActivePage(stagehandPage);
        }
      }
      return instance;
    });
  }
  get context() {
    return this.intContext;
  }
  getStagehandPage(page) {
    return __async(this, null, function* () {
      let stagehandPage = this.pageMap.get(page);
      if (!stagehandPage) {
        stagehandPage = yield this.createStagehandPage(page);
      }
      this.setActivePage(stagehandPage);
      return stagehandPage;
    });
  }
  getStagehandPages() {
    return __async(this, null, function* () {
      const pwPages = this.intContext.pages();
      return Promise.all(
        pwPages.map((page) => this.getStagehandPage(page))
      );
    });
  }
  setActivePage(page) {
    this.activeStagehandPage = page;
    this.stagehand["setActivePage"](page);
  }
  getActivePage() {
    return this.activeStagehandPage;
  }
};

// lib/api.ts
var import_zod_to_json_schema = __toESM(require("zod-to-json-schema"));
var StagehandAPI = class {
  constructor({ apiKey, projectId, logger }) {
    this.apiKey = apiKey;
    this.projectId = projectId;
    this.logger = logger;
  }
  init(_0) {
    return __async(this, arguments, function* ({
      modelName,
      modelApiKey,
      domSettleTimeoutMs,
      verbose,
      debugDom,
      systemPrompt,
      browserbaseSessionCreateParams
    }) {
      const whitelistResponse = yield this.request("/healthcheck");
      if (whitelistResponse.status === 401) {
        throw new Error(
          "Unauthorized. Ensure you provided a valid API key and that it is whitelisted."
        );
      } else if (whitelistResponse.status !== 200) {
        throw new Error(`Unknown error: ${whitelistResponse.status}`);
      }
      const sessionResponse = yield this.request("/sessions/start", {
        method: "POST",
        body: JSON.stringify({
          modelName,
          domSettleTimeoutMs,
          verbose,
          debugDom,
          systemPrompt,
          browserbaseSessionCreateParams
        }),
        headers: {
          "x-model-api-key": modelApiKey
        }
      });
      if (sessionResponse.status !== 200) {
        console.log(yield sessionResponse.text());
        throw new Error(`Unknown error: ${sessionResponse.status}`);
      }
      const sessionResponseBody = yield sessionResponse.json();
      if (sessionResponseBody.success === false) {
        throw new Error(sessionResponseBody.message);
      }
      this.sessionId = sessionResponseBody.data.sessionId;
      return sessionResponseBody.data;
    });
  }
  act(options) {
    return __async(this, null, function* () {
      return this.execute({
        method: "act",
        args: __spreadValues({}, options)
      });
    });
  }
  extract(options) {
    return __async(this, null, function* () {
      const parsedSchema = (0, import_zod_to_json_schema.default)(options.schema);
      return this.execute({
        method: "extract",
        args: __spreadProps(__spreadValues({}, options), { schemaDefinition: parsedSchema })
      });
    });
  }
  observe(options) {
    return __async(this, null, function* () {
      return this.execute({
        method: "observe",
        args: __spreadValues({}, options)
      });
    });
  }
  goto(url, options) {
    return __async(this, null, function* () {
      return this.execute({
        method: "navigate",
        args: { url, options }
      });
    });
  }
  end() {
    return __async(this, null, function* () {
      const url = `/sessions/${this.sessionId}/end`;
      return yield this.request(url, {
        method: "POST"
      });
    });
  }
  execute(_0) {
    return __async(this, arguments, function* ({
      method,
      args,
      params
    }) {
      const urlParams = new URLSearchParams(params);
      const queryString = urlParams.toString();
      const url = `/sessions/${this.sessionId}/${method}${queryString ? `?${queryString}` : ""}`;
      const response = yield this.request(url, {
        method: "POST",
        body: JSON.stringify(args)
      });
      if (!response.ok) {
        const errorBody = yield response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorBody}`
        );
      }
      if (!response.body) {
        throw new Error("Response body is null");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = yield reader.read();
        if (done && !buffer) {
          return null;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const eventData = JSON.parse(line.slice(6));
            if (eventData.type === "system") {
              if (eventData.data.status === "error") {
                throw new Error(eventData.data.error);
              }
              if (eventData.data.status === "finished") {
                return eventData.data.result;
              }
            } else if (eventData.type === "log") {
              this.logger(eventData.data.message);
            }
          } catch (e) {
            console.error("Error parsing event data:", e);
            throw new Error("Failed to parse server response");
          }
        }
        if (done) break;
      }
    });
  }
  request(_0) {
    return __async(this, arguments, function* (path3, options = {}) {
      const defaultHeaders = {
        "x-bb-api-key": this.apiKey,
        "x-bb-project-id": this.projectId,
        "x-bb-session-id": this.sessionId,
        // we want real-time logs, so we stream the response
        "x-stream-response": "true"
      };
      if (options.method === "POST" && options.body) {
        defaultHeaders["Content-Type"] = "application/json";
      }
      const response = yield fetch(`${process.env.STAGEHAND_API_URL}${path3}`, __spreadProps(__spreadValues({}, options), {
        headers: __spreadValues(__spreadValues({}, defaultHeaders), options.headers)
      }));
      return response;
    });
  }
};

// lib/dom/build/scriptContent.ts
var scriptContent = '(() => {\n  // lib/dom/elementCheckUtils.ts\n  function isElementNode(node) {\n    return node.nodeType === Node.ELEMENT_NODE;\n  }\n  function isTextNode(node) {\n    return node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim());\n  }\n  var leafElementDenyList = ["SVG", "IFRAME", "SCRIPT", "STYLE", "LINK"];\n  var interactiveElementTypes = [\n    "A",\n    "BUTTON",\n    "DETAILS",\n    "EMBED",\n    "INPUT",\n    "LABEL",\n    "MENU",\n    "MENUITEM",\n    "OBJECT",\n    "SELECT",\n    "TEXTAREA",\n    "SUMMARY"\n  ];\n  var interactiveRoles = [\n    "button",\n    "menu",\n    "menuitem",\n    "link",\n    "checkbox",\n    "radio",\n    "slider",\n    "tab",\n    "tabpanel",\n    "textbox",\n    "combobox",\n    "grid",\n    "listbox",\n    "option",\n    "progressbar",\n    "scrollbar",\n    "searchbox",\n    "switch",\n    "tree",\n    "treeitem",\n    "spinbutton",\n    "tooltip"\n  ];\n  var interactiveAriaRoles = ["menu", "menuitem", "button"];\n  var isVisible = (element) => {\n    const rect = element.getBoundingClientRect();\n    if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.top > window.innerHeight) {\n      return false;\n    }\n    if (!isTopElement(element, rect)) {\n      return false;\n    }\n    const visible = element.checkVisibility({\n      checkOpacity: true,\n      checkVisibilityCSS: true\n    });\n    return visible;\n  };\n  var isTextVisible = (element) => {\n    const range = document.createRange();\n    range.selectNodeContents(element);\n    const rect = range.getBoundingClientRect();\n    if (rect.width === 0 || rect.height === 0 || rect.top < 0 || rect.top > window.innerHeight) {\n      return false;\n    }\n    const parent = element.parentElement;\n    if (!parent) {\n      return false;\n    }\n    const visible = parent.checkVisibility({\n      checkOpacity: true,\n      checkVisibilityCSS: true\n    });\n    return visible;\n  };\n  function isTopElement(elem, rect) {\n    const points = [\n      { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.25 },\n      { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.25 },\n      { x: rect.left + rect.width * 0.25, y: rect.top + rect.height * 0.75 },\n      { x: rect.left + rect.width * 0.75, y: rect.top + rect.height * 0.75 },\n      { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }\n    ];\n    return points.some((point) => {\n      const topEl = document.elementFromPoint(point.x, point.y);\n      let current = topEl;\n      while (current && current !== document.body) {\n        if (current.isSameNode(elem)) {\n          return true;\n        }\n        current = current.parentElement;\n      }\n      return false;\n    });\n  }\n  var isActive = (element) => {\n    if (element.hasAttribute("disabled") || element.hasAttribute("hidden") || element.getAttribute("aria-disabled") === "true") {\n      return false;\n    }\n    return true;\n  };\n  var isInteractiveElement = (element) => {\n    const elementType = element.tagName;\n    const elementRole = element.getAttribute("role");\n    const elementAriaRole = element.getAttribute("aria-role");\n    return elementType && interactiveElementTypes.includes(elementType) || elementRole && interactiveRoles.includes(elementRole) || elementAriaRole && interactiveAriaRoles.includes(elementAriaRole);\n  };\n  var isLeafElement = (element) => {\n    if (element.textContent === "") {\n      return false;\n    }\n    if (element.childNodes.length === 0) {\n      return !leafElementDenyList.includes(element.tagName);\n    }\n    if (element.childNodes.length === 1 && isTextNode(element.childNodes[0])) {\n      return true;\n    }\n    return false;\n  };\n\n  // lib/dom/xpathUtils.ts\n  function getParentElement(node) {\n    return isElementNode(node) ? node.parentElement : node.parentNode;\n  }\n  function getCombinations(attributes, size) {\n    const results = [];\n    function helper(start, combo) {\n      if (combo.length === size) {\n        results.push([...combo]);\n        return;\n      }\n      for (let i = start; i < attributes.length; i++) {\n        combo.push(attributes[i]);\n        helper(i + 1, combo);\n        combo.pop();\n      }\n    }\n    helper(0, []);\n    return results;\n  }\n  function isXPathFirstResultElement(xpath, target) {\n    try {\n      const result = document.evaluate(\n        xpath,\n        document.documentElement,\n        null,\n        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,\n        null\n      );\n      return result.snapshotItem(0) === target;\n    } catch (error) {\n      console.warn(`Invalid XPath expression: ${xpath}`, error);\n      return false;\n    }\n  }\n  function escapeXPathString(value) {\n    if (value.includes("\'")) {\n      if (value.includes(\'"\')) {\n        return "concat(" + value.split(/(\'+)/).map((part) => {\n          if (part === "\'") {\n            return `"\'"`;\n          } else if (part.startsWith("\'") && part.endsWith("\'")) {\n            return `"${part}"`;\n          } else {\n            return `\'${part}\'`;\n          }\n        }).join(",") + ")";\n      } else {\n        return `"${value}"`;\n      }\n    } else {\n      return `\'${value}\'`;\n    }\n  }\n  async function generateXPathsForElement(element) {\n    if (!element) return [];\n    const [complexXPath, standardXPath, idBasedXPath] = await Promise.all([\n      generateComplexXPath(element),\n      generateStandardXPath(element),\n      generatedIdBasedXPath(element)\n    ]);\n    return [standardXPath, ...idBasedXPath ? [idBasedXPath] : [], complexXPath];\n  }\n  async function generateComplexXPath(element) {\n    const parts = [];\n    let currentElement = element;\n    while (currentElement && (isTextNode(currentElement) || isElementNode(currentElement))) {\n      if (isElementNode(currentElement)) {\n        const el = currentElement;\n        let selector = el.tagName.toLowerCase();\n        const attributePriority = [\n          "data-qa",\n          "data-component",\n          "data-role",\n          "role",\n          "aria-role",\n          "type",\n          "name",\n          "aria-label",\n          "placeholder",\n          "title",\n          "alt"\n        ];\n        const attributes = attributePriority.map((attr) => {\n          let value = el.getAttribute(attr);\n          if (attr === "href-full" && value) {\n            value = el.getAttribute("href");\n          }\n          return value ? { attr: attr === "href-full" ? "href" : attr, value } : null;\n        }).filter((attr) => attr !== null);\n        let uniqueSelector = "";\n        for (let i = 1; i <= attributes.length; i++) {\n          const combinations = getCombinations(attributes, i);\n          for (const combo of combinations) {\n            const conditions = combo.map((a) => `@${a.attr}=${escapeXPathString(a.value)}`).join(" and ");\n            const xpath2 = `//${selector}[${conditions}]`;\n            if (isXPathFirstResultElement(xpath2, el)) {\n              uniqueSelector = xpath2;\n              break;\n            }\n          }\n          if (uniqueSelector) break;\n        }\n        if (uniqueSelector) {\n          parts.unshift(uniqueSelector.replace("//", ""));\n          break;\n        } else {\n          const parent = getParentElement(el);\n          if (parent) {\n            const siblings = Array.from(parent.children).filter(\n              (sibling) => sibling.tagName === el.tagName\n            );\n            const index = siblings.indexOf(el) + 1;\n            selector += siblings.length > 1 ? `[${index}]` : "";\n          }\n          parts.unshift(selector);\n        }\n      }\n      currentElement = getParentElement(currentElement);\n    }\n    const xpath = "//" + parts.join("/");\n    return xpath;\n  }\n  async function generateStandardXPath(element) {\n    const parts = [];\n    while (element && (isTextNode(element) || isElementNode(element))) {\n      let index = 0;\n      let hasSameTypeSiblings = false;\n      const siblings = element.parentElement ? Array.from(element.parentElement.childNodes) : [];\n      for (let i = 0; i < siblings.length; i++) {\n        const sibling = siblings[i];\n        if (sibling.nodeType === element.nodeType && sibling.nodeName === element.nodeName) {\n          index = index + 1;\n          hasSameTypeSiblings = true;\n          if (sibling.isSameNode(element)) {\n            break;\n          }\n        }\n      }\n      if (element.nodeName !== "#text") {\n        const tagName = element.nodeName.toLowerCase();\n        const pathIndex = hasSameTypeSiblings ? `[${index}]` : "";\n        parts.unshift(`${tagName}${pathIndex}`);\n      }\n      element = element.parentElement;\n    }\n    return parts.length ? `/${parts.join("/")}` : "";\n  }\n  async function generatedIdBasedXPath(element) {\n    if (isElementNode(element) && element.id) {\n      return `//*[@id=\'${element.id}\']`;\n    }\n    return null;\n  }\n\n  // lib/dom/utils.ts\n  async function waitForDomSettle() {\n    return new Promise((resolve) => {\n      const createTimeout = () => {\n        return setTimeout(() => {\n          resolve();\n        }, 2e3);\n      };\n      let timeout = createTimeout();\n      const observer = new MutationObserver(() => {\n        clearTimeout(timeout);\n        timeout = createTimeout();\n      });\n      observer.observe(window.document.body, { childList: true, subtree: true });\n    });\n  }\n  window.waitForDomSettle = waitForDomSettle;\n  function calculateViewportHeight() {\n    return Math.ceil(window.innerHeight * 0.75);\n  }\n  function canElementScroll(elem) {\n    if (typeof elem.scrollTo !== "function") {\n      console.warn("canElementScroll: .scrollTo is not a function.");\n      return false;\n    }\n    try {\n      const originalTop = elem.scrollTop;\n      elem.scrollTo({\n        top: originalTop + 100,\n        left: 0,\n        behavior: "instant"\n      });\n      if (elem.scrollTop === originalTop) {\n        throw new Error("scrollTop did not change");\n      }\n      elem.scrollTo({\n        top: originalTop,\n        left: 0,\n        behavior: "instant"\n      });\n      return true;\n    } catch (error) {\n      console.warn("canElementScroll error:", error.message || error);\n      return false;\n    }\n  }\n  function getNodeFromXpath(xpath) {\n    return document.evaluate(\n      xpath,\n      document.documentElement,\n      null,\n      XPathResult.FIRST_ORDERED_NODE_TYPE,\n      null\n    ).singleNodeValue;\n  }\n\n  // lib/dom/candidateCollector.ts\n  var xpathCache = /* @__PURE__ */ new Map();\n  async function collectCandidateElements(candidateContainerRoot, indexOffset = 0) {\n    const DOMQueue = [...candidateContainerRoot.childNodes];\n    const candidateElements = [];\n    while (DOMQueue.length > 0) {\n      const node = DOMQueue.pop();\n      let shouldAdd = false;\n      if (node && isElementNode(node)) {\n        for (let i = node.childNodes.length - 1; i >= 0; i--) {\n          DOMQueue.push(node.childNodes[i]);\n        }\n        if (isInteractiveElement(node)) {\n          if (isActive(node) && isVisible(node)) {\n            shouldAdd = true;\n          }\n        }\n        if (isLeafElement(node)) {\n          if (isActive(node) && isVisible(node)) {\n            shouldAdd = true;\n          }\n        }\n      }\n      if (node && isTextNode(node) && isTextVisible(node)) {\n        shouldAdd = true;\n      }\n      if (shouldAdd) {\n        candidateElements.push(node);\n      }\n    }\n    const selectorMap = {};\n    let outputString = "";\n    const xpathLists = await Promise.all(\n      candidateElements.map((elem) => {\n        if (xpathCache.has(elem)) {\n          return Promise.resolve(xpathCache.get(elem));\n        }\n        return generateXPathsForElement(elem).then((xpaths) => {\n          xpathCache.set(elem, xpaths);\n          return xpaths;\n        });\n      })\n    );\n    candidateElements.forEach((elem, idx) => {\n      const xpaths = xpathLists[idx];\n      let elemOutput = "";\n      if (isTextNode(elem)) {\n        const textContent = elem.textContent?.trim();\n        if (textContent) {\n          elemOutput += `${idx + indexOffset}:${textContent}\n`;\n        }\n      } else if (isElementNode(elem)) {\n        const tagName = elem.tagName.toLowerCase();\n        const attributes = collectEssentialAttributes(elem);\n        const opening = `<${tagName}${attributes ? " " + attributes : ""}>`;\n        const closing = `</${tagName}>`;\n        const textContent = elem.textContent?.trim() || "";\n        elemOutput += `${idx + indexOffset}:${opening}${textContent}${closing}\n`;\n      }\n      outputString += elemOutput;\n      selectorMap[idx + indexOffset] = xpaths;\n    });\n    return { outputString, selectorMap };\n  }\n  function collectEssentialAttributes(element) {\n    const essentialAttributes = [\n      "id",\n      "class",\n      "href",\n      "src",\n      "aria-label",\n      "aria-name",\n      "aria-role",\n      "aria-description",\n      "aria-expanded",\n      "aria-haspopup",\n      "type",\n      "value"\n    ];\n    const attrs = essentialAttributes.map((attr) => {\n      const value = element.getAttribute(attr);\n      return value ? `${attr}="${value}"` : "";\n    }).filter((attr) => attr !== "");\n    Array.from(element.attributes).forEach((attr) => {\n      if (attr.name.startsWith("data-")) {\n        attrs.push(`${attr.name}="${attr.value}"`);\n      }\n    });\n    return attrs.join(" ");\n  }\n\n  // lib/dom/StagehandContainer.ts\n  var StagehandContainer = class {\n    /**\n     * Collects multiple "DOM chunks" by scrolling through the container\n     * in increments from `startOffset` to `endOffset`. At each scroll\n     * position, the function extracts a snapshot of "candidate elements"\n     * using `collectCandidateElements`.\n     *\n     * Each chunk represents a subset of the DOM at a particular\n     * vertical scroll offset, including:\n     *\n     * - `startOffset` & `endOffset`: The vertical scroll bounds for this chunk.\n     * - `outputString`: A serialized representation of extracted DOM text.\n     * - `selectorMap`: A mapping of temporary indices to the actual element(s)\n     *   that were collected in this chunk, useful for further processing.\n     *\n     * @param startOffset - The initial scroll offset from which to begin collecting.\n     * @param endOffset - The maximum scroll offset to collect up to.\n     * @param chunkSize - The vertical increment to move between each chunk.\n     * @param scrollTo - Whether we should scroll to the chunk\n     * @param scrollBackToTop - Whether to scroll the container back to the top once finished.\n     * @param candidateContainer - Optionally, a specific container element within\n     * the root for which to collect data. If omitted, uses `this.getRootElement()`.\n     *\n     * @returns A promise that resolves with an array of `DomChunk` objects.\n     *\n     * ### How It Works\n     *\n     * 1. **Scroll Range Calculation**:\n     *    - Computes `maxOffset` as the maximum offset that can be scrolled\n     *      (`scrollHeight - viewportHeight`).\n     *    - Restricts `endOffset` to not exceed `maxOffset`.\n     *\n     * 2. **Chunk Iteration**:\n     *    - Loops from `startOffset` to `endOffset` in steps of `chunkSize`.\n     *    - For each offset `current`, we call `this.scrollTo(current)`\n     *      to position the container.\n     *\n     * 3. **Element Collection**:\n     *    - Invokes `collectCandidateElements` on either `candidateContainer`\n     *      (if provided) or the result of `this.getRootElement()`.\n     *    - This returns both an `outputString` (serialized text)\n     *      and a `selectorMap` of found elements for that section of the DOM.\n     *\n     * 4. **Chunk Assembly**:\n     *    - Creates a `DomChunk` object for the current offset range,\n     *      storing `outputString`, `selectorMap`, and scroll offsets.\n     *    - Pushes it onto the `chunks` array.\n     *\n     * 5. **Scroll Reset**:\n     *    - Once iteration completes, if `scrollBackToTop` is `true`,\n     *      we scroll back to offset `0`.\n     */\n    async collectDomChunks(startOffset, endOffset, chunkSize, scrollTo = true, scrollBackToTop = true, candidateContainer) {\n      const chunks = [];\n      let maxOffset = this.getScrollHeight();\n      let current = startOffset;\n      let finalEnd = endOffset;\n      let index = 0;\n      while (current <= finalEnd) {\n        if (scrollTo) {\n          await this.scrollTo(current);\n        }\n        const rootCandidate = candidateContainer || this.getRootElement();\n        const { outputString, selectorMap } = await collectCandidateElements(\n          rootCandidate,\n          index\n        );\n        chunks.push({\n          startOffset: current,\n          endOffset: current + chunkSize,\n          outputString,\n          selectorMap\n        });\n        index += Object.keys(selectorMap).length;\n        current += chunkSize;\n        if (!candidateContainer && current > endOffset) {\n          const newScrollHeight = this.getScrollHeight();\n          if (newScrollHeight > maxOffset) {\n            maxOffset = newScrollHeight;\n          }\n          if (newScrollHeight > finalEnd) {\n            finalEnd = newScrollHeight;\n          }\n        }\n      }\n      if (scrollBackToTop) {\n        await this.scrollTo(0);\n      }\n      return chunks;\n    }\n  };\n\n  // lib/dom/GlobalPageContainer.ts\n  var GlobalPageContainer = class extends StagehandContainer {\n    getRootElement() {\n      return document.body;\n    }\n    /**\n     * Calculates the viewport height for the entire page, using a helper.\n     * The helper returns 75% of the window height, to ensure that we don\'t\n     * miss any content that may be behind sticky elements like nav bars.\n     *\n     * @returns The current height of the global viewport, in pixels.\n     */\n    getViewportHeight() {\n      return calculateViewportHeight();\n    }\n    getScrollHeight() {\n      return document.documentElement.scrollHeight;\n    }\n    getScrollPosition() {\n      return window.scrollY;\n    }\n    /**\n     * Smoothly scrolls the page to the specified vertical offset, and then\n     * waits until scrolling has stopped. There is a delay built in to allow\n     * for lazy loading and other asynchronous content to load.\n     *\n     * @param offset - The desired scroll offset from the top of the page.\n     * @returns A promise that resolves once scrolling is complete.\n     */\n    async scrollTo(offset) {\n      await new Promise((resolve) => setTimeout(resolve, 1500));\n      window.scrollTo({ top: offset, behavior: "smooth" });\n      await this.waitForScrollEnd();\n    }\n    /**\n     * Scrolls the page so that a given element is visible, or scrolls to the top\n     * if no element is specified. Uses smooth scrolling and waits for it to complete.\n     *\n     * @param element - The DOM element to bring into view. If omitted, scrolls to top.\n     * @returns A promise that resolves once scrolling is complete.\n     */\n    async scrollIntoView(element) {\n      if (!element) {\n        window.scrollTo({ top: 0, behavior: "smooth" });\n      } else {\n        const rect = element.getBoundingClientRect();\n        const currentY = window.scrollY || document.documentElement.scrollTop;\n        const elementY = currentY + rect.top - window.innerHeight * 0.25;\n        window.scrollTo({ top: elementY, behavior: "smooth" });\n      }\n      await this.waitForScrollEnd();\n    }\n    /**\n     * Internal helper that waits until the global scroll activity has stopped.\n     * It listens for scroll events, resetting a short timer every time a scroll\n     * occurs, and resolves once there\'s no scroll for ~100ms.\n     *\n     * @returns A promise that resolves when scrolling has finished.\n     */\n    async waitForScrollEnd() {\n      return new Promise((resolve) => {\n        let scrollEndTimer;\n        const handleScroll = () => {\n          clearTimeout(scrollEndTimer);\n          scrollEndTimer = window.setTimeout(() => {\n            window.removeEventListener("scroll", handleScroll);\n            resolve();\n          }, 100);\n        };\n        window.addEventListener("scroll", handleScroll, { passive: true });\n        handleScroll();\n      });\n    }\n  };\n\n  // lib/dom/ElementContainer.ts\n  var ElementContainer = class extends StagehandContainer {\n    /**\n     * Creates an instance of `ElementContainer` tied to a specific element.\n     * @param el - The scrollable `HTMLElement` that this container controls.\n     */\n    constructor(el) {\n      super();\n      this.el = el;\n    }\n    getRootElement() {\n      return this.el;\n    }\n    /**\n     * Retrieves the height of the visible viewport within this element\n     * (`el.clientHeight`).\n     *\n     * @returns The visible (client) height of the element, in pixels.\n     */\n    getViewportHeight() {\n      return this.el.clientHeight;\n    }\n    getScrollHeight() {\n      return this.el.scrollHeight;\n    }\n    /**\n     * Returns the element\'s current vertical scroll offset.\n     */\n    getScrollPosition() {\n      return this.el.scrollTop;\n    }\n    /**\n     * Smoothly scrolls this element to the specified vertical offset, and\n     * waits for the scrolling to complete.\n     *\n     * @param offset - The scroll offset (in pixels) from the top of the element.\n     * @returns A promise that resolves once scrolling is finished.\n     */\n    async scrollTo(offset) {\n      await new Promise((resolve) => setTimeout(resolve, 1500));\n      this.el.scrollTo({ top: offset, behavior: "smooth" });\n      await this.waitForScrollEnd();\n    }\n    /**\n     * Scrolls this element so that the given `element` is visible, or\n     * scrolls to the top if none is provided. Smoothly animates the scroll\n     * and waits until it finishes.\n     *\n     * @param element - The child element to bring into view. If omitted, scrolls to top.\n     * @returns A promise that resolves once scrolling completes.\n     */\n    async scrollIntoView(element) {\n      if (!element) {\n        this.el.scrollTo({ top: 0, behavior: "smooth" });\n      } else {\n        element.scrollIntoView();\n      }\n      await this.waitForScrollEnd();\n    }\n    /**\n     * Internal helper that waits until scrolling in this element has\n     * fully stopped. It listens for scroll events on the element,\n     * resetting a short timer every time a scroll occurs, and resolves\n     * once there\'s no scroll for ~100ms.\n     *\n     * @returns A promise that resolves when scrolling has finished.\n     */\n    async waitForScrollEnd() {\n      return new Promise((resolve) => {\n        let scrollEndTimer;\n        const handleScroll = () => {\n          clearTimeout(scrollEndTimer);\n          scrollEndTimer = window.setTimeout(() => {\n            this.el.removeEventListener("scroll", handleScroll);\n            resolve();\n          }, 100);\n        };\n        this.el.addEventListener("scroll", handleScroll, { passive: true });\n        handleScroll();\n      });\n    }\n  };\n\n  // lib/dom/containerFactory.ts\n  function createStagehandContainer(obj) {\n    if (obj instanceof Window) {\n      return new GlobalPageContainer();\n    } else {\n      return new ElementContainer(obj);\n    }\n  }\n\n  // lib/dom/process.ts\n  function getScrollableElements(topN) {\n    const docEl = document.documentElement;\n    const scrollableElements = [docEl];\n    const allElements = document.querySelectorAll("*");\n    for (const elem of allElements) {\n      const style = window.getComputedStyle(elem);\n      const overflowY = style.overflowY;\n      const isPotentiallyScrollable = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";\n      if (isPotentiallyScrollable) {\n        const candidateScrollDiff = elem.scrollHeight - elem.clientHeight;\n        if (candidateScrollDiff > 0 && canElementScroll(elem)) {\n          scrollableElements.push(elem);\n        }\n      }\n    }\n    scrollableElements.sort((a, b) => b.scrollHeight - a.scrollHeight);\n    if (topN !== void 0) {\n      return scrollableElements.slice(0, topN);\n    }\n    return scrollableElements;\n  }\n  async function getScrollableElementXpaths(topN) {\n    const scrollableElems = getScrollableElements(topN);\n    const xpaths = [];\n    for (const elem of scrollableElems) {\n      const allXPaths = await generateXPathsForElement(elem);\n      const firstXPath = allXPaths?.[0] || "";\n      xpaths.push(firstXPath);\n    }\n    return xpaths;\n  }\n  function getNearestScrollableParent(el) {\n    const allScrollables = getScrollableElements();\n    let current = el;\n    while (current) {\n      if (allScrollables.includes(current)) {\n        return current;\n      }\n      current = current.parentElement;\n    }\n    return document.documentElement;\n  }\n  async function processDom(chunksSeen) {\n    const { chunk, chunksArray } = await pickChunk(chunksSeen);\n    const container = new GlobalPageContainer();\n    const chunkSize = container.getViewportHeight();\n    const startOffset = chunk * chunkSize;\n    const endOffset = startOffset;\n    const domChunks = await container.collectDomChunks(\n      startOffset,\n      endOffset,\n      chunkSize,\n      true,\n      false,\n      // scrollBackToTop\n      container.getRootElement()\n      // BFS entire doc\n    );\n    const [domChunk] = domChunks;\n    if (!domChunk) {\n      return {\n        outputString: "",\n        selectorMap: {},\n        chunk,\n        chunks: chunksArray\n      };\n    }\n    console.log("Extracted DOM chunk:\\n", domChunk.outputString);\n    return {\n      outputString: domChunk.outputString,\n      selectorMap: domChunk.selectorMap,\n      chunk,\n      chunks: chunksArray\n    };\n  }\n  async function processAllOfDom(xpath) {\n    let candidateElementContainer = null;\n    let scrollTarget;\n    if (xpath) {\n      const node = getNodeFromXpath(xpath);\n      if (node) {\n        candidateElementContainer = node;\n        console.log(`Found element via XPath: ${xpath}`);\n        const scrollableElem = getNearestScrollableParent(\n          candidateElementContainer\n        );\n        if (scrollableElem === document.documentElement) {\n          scrollTarget = new GlobalPageContainer();\n        } else {\n          scrollTarget = new ElementContainer(scrollableElem);\n        }\n        await scrollTarget.scrollIntoView(candidateElementContainer);\n        const startOffset2 = scrollTarget.getScrollPosition();\n        const scrollTargetHeight = scrollTarget.getViewportHeight();\n        const candidateElementContainerHeight = candidateElementContainer.scrollHeight;\n        if (candidateElementContainerHeight <= scrollTargetHeight) {\n          console.log(\n            "Element is smaller/equal to container\\u2019s viewport. Doing single chunk."\n          );\n          const domChunks2 = await scrollTarget.collectDomChunks(\n            startOffset2,\n            // startOffset\n            startOffset2,\n            // endOffset => same as start => 1 chunk\n            1,\n            // chunkSize=1 => doesn\'t matter, because start==end means exactly 1 iteration\n            true,\n            true,\n            candidateElementContainer\n          );\n          const singleChunkOutput = combineChunks(domChunks2);\n          console.log(\n            "Final output (single-chunk):",\n            singleChunkOutput.outputString\n          );\n          return singleChunkOutput;\n        }\n        console.log("Element is bigger. Doing multi-chunk approach.");\n      } else {\n        console.warn(`XPath not found: ${xpath}. Using entire doc.`);\n      }\n    } else {\n      const scrollableElems = getScrollableElements(1);\n      const mainScrollable = scrollableElems[0];\n      scrollTarget = mainScrollable === document.documentElement ? createStagehandContainer(window) : createStagehandContainer(mainScrollable);\n    }\n    const startOffset = scrollTarget.getScrollPosition();\n    const viewportHeight = scrollTarget.getViewportHeight();\n    const maxScroll = candidateElementContainer ? startOffset + candidateElementContainer.scrollHeight : scrollTarget.getScrollHeight();\n    const chunkSize = viewportHeight;\n    console.log("processAllOfDom chunk-based from", startOffset, "to", maxScroll);\n    const domChunks = await scrollTarget.collectDomChunks(\n      startOffset,\n      maxScroll,\n      chunkSize,\n      true,\n      true,\n      candidateElementContainer ?? void 0\n    );\n    const finalOutput = combineChunks(domChunks);\n    console.log(\n      "All DOM elements combined (chunk-based):",\n      finalOutput.outputString\n    );\n    return finalOutput;\n  }\n  function combineChunks(domChunks) {\n    const outputString = domChunks.map((c) => c.outputString).join("");\n    let finalSelectorMap = {};\n    domChunks.forEach((c) => {\n      finalSelectorMap = { ...finalSelectorMap, ...c.selectorMap };\n    });\n    return { outputString, selectorMap: finalSelectorMap };\n  }\n  function storeDOM(xpath) {\n    if (!xpath) {\n      const originalDOM = document.body.cloneNode(true);\n      console.log("DOM state stored (root).");\n      return originalDOM.outerHTML;\n    } else {\n      const node = getNodeFromXpath(xpath);\n      if (!node) {\n        console.error(\n          `storeDOM: No element found for xpath: ${xpath}. Returning empty string.`\n        );\n        return "";\n      }\n      console.log(`DOM state stored (element at xpath: ${xpath}).`);\n      return node.outerHTML;\n    }\n  }\n  function restoreDOM(storedDOM, xpath) {\n    console.log("Restoring DOM...");\n    if (!storedDOM) {\n      console.error("No DOM state was provided.");\n      return;\n    }\n    if (!xpath) {\n      document.body.innerHTML = storedDOM;\n      console.log("DOM restored (root).");\n    } else {\n      const node = getNodeFromXpath(xpath);\n      if (!node) {\n        console.error(\n          `restoreDOM: No element found for xpath: ${xpath}. Cannot restore.`\n        );\n        return;\n      }\n      node.outerHTML = storedDOM;\n      console.log(`DOM restored (element at xpath: ${xpath}).`);\n    }\n  }\n  function createTextBoundingBoxes(xpath) {\n    const style = document.createElement("style");\n    document.head.appendChild(style);\n    if (style.sheet) {\n      style.sheet.insertRule(\n        `\n      .stagehand-highlighted-word, .stagehand-space {\n        border: 0px solid orange;\n        display: inline-block !important;\n        visibility: visible;\n      }\n    `,\n        0\n      );\n      style.sheet.insertRule(\n        `\n        code .stagehand-highlighted-word, code .stagehand-space,\n        pre .stagehand-highlighted-word, pre .stagehand-space {\n          white-space: pre-wrap;\n          display: inline !important;\n      }\n     `,\n        1\n      );\n    }\n    function applyHighlighting(root) {\n      const containerSelector = root instanceof Document ? "body *" : "*";\n      root.querySelectorAll(containerSelector).forEach((element) => {\n        if (element.closest && element.closest(".stagehand-nav, .stagehand-marker")) {\n          return;\n        }\n        if (["SCRIPT", "STYLE", "IFRAME", "INPUT"].includes(element.tagName)) {\n          return;\n        }\n        const childNodes = Array.from(element.childNodes);\n        childNodes.forEach((node) => {\n          if (node.nodeType === 3 && node.textContent?.trim().length > 0) {\n            const textContent = node.textContent.replace(/\\u00A0/g, " ");\n            const tokens = textContent.split(/(\\s+)/g);\n            const fragment = document.createDocumentFragment();\n            const parentIsCode = element.tagName === "CODE";\n            tokens.forEach((token) => {\n              const span = document.createElement("span");\n              span.textContent = token;\n              if (parentIsCode) {\n                span.style.whiteSpace = "pre-wrap";\n                span.style.display = "inline";\n              }\n              span.className = token.trim().length === 0 ? "stagehand-space" : "stagehand-highlighted-word";\n              fragment.appendChild(span);\n            });\n            if (fragment.childNodes.length > 0 && node.parentNode) {\n              element.insertBefore(fragment, node);\n              node.remove();\n            }\n          }\n        });\n      });\n    }\n    if (!xpath) {\n      applyHighlighting(document);\n      document.querySelectorAll("iframe").forEach((iframe) => {\n        try {\n          iframe.contentWindow?.postMessage({ action: "highlight" }, "*");\n        } catch (error) {\n          console.error("Error accessing iframe content: ", error);\n        }\n      });\n    } else {\n      const node = getNodeFromXpath(xpath);\n      if (!node) {\n        console.warn(\n          `createTextBoundingBoxes: No element found for xpath "${xpath}".`\n        );\n        return;\n      }\n      applyHighlighting(node);\n    }\n  }\n  function getElementBoundingBoxes(xpath) {\n    const element = getNodeFromXpath(xpath);\n    if (!element) return [];\n    const isValidText = (text) => text && text.trim().length > 0;\n    let dropDownElem = element.querySelector("option[selected]");\n    if (!dropDownElem) {\n      dropDownElem = element.querySelector("option");\n    }\n    if (dropDownElem) {\n      const elemText = dropDownElem.textContent || "";\n      if (isValidText(elemText)) {\n        const parentRect = element.getBoundingClientRect();\n        return [\n          {\n            text: elemText.trim(),\n            top: parentRect.top + window.scrollY,\n            left: parentRect.left + window.scrollX,\n            width: parentRect.width,\n            height: parentRect.height\n          }\n        ];\n      } else {\n        return [];\n      }\n    }\n    let placeholderText = "";\n    if ((element.tagName.toLowerCase() === "input" || element.tagName.toLowerCase() === "textarea") && element.placeholder) {\n      placeholderText = element.placeholder;\n    } else if (element.tagName.toLowerCase() === "a") {\n      placeholderText = "";\n    } else if (element.tagName.toLowerCase() === "img") {\n      placeholderText = element.alt || "";\n    }\n    const words = element.querySelectorAll(\n      ".stagehand-highlighted-word"\n    );\n    const boundingBoxes = Array.from(words).map((word) => {\n      const rect = word.getBoundingClientRect();\n      return {\n        text: word.innerText || "",\n        top: rect.top + window.scrollY,\n        left: rect.left + window.scrollX,\n        width: rect.width,\n        height: rect.height * 0.75\n      };\n    }).filter(\n      (box) => box.width > 0 && box.height > 0 && box.top >= 0 && box.left >= 0 && isValidText(box.text)\n    );\n    if (boundingBoxes.length === 0) {\n      const elementRect = element.getBoundingClientRect();\n      return [\n        {\n          text: placeholderText,\n          top: elementRect.top + window.scrollY,\n          left: elementRect.left + window.scrollX,\n          width: elementRect.width,\n          height: elementRect.height * 0.75\n        }\n      ];\n    }\n    return boundingBoxes;\n  }\n  window.processDom = processDom;\n  window.processAllOfDom = processAllOfDom;\n  window.storeDOM = storeDOM;\n  window.restoreDOM = restoreDOM;\n  window.createTextBoundingBoxes = createTextBoundingBoxes;\n  window.getElementBoundingBoxes = getElementBoundingBoxes;\n  window.createStagehandContainer = createStagehandContainer;\n  window.getScrollableElementXpaths = getScrollableElementXpaths;\n  window.getNodeFromXpath = getNodeFromXpath;\n  async function pickChunk(chunksSeen) {\n    const viewportHeight = calculateViewportHeight();\n    const documentHeight = document.documentElement.scrollHeight;\n    const chunks = Math.ceil(documentHeight / viewportHeight);\n    const chunksArray = Array.from({ length: chunks }, (_, i) => i);\n    const chunksRemaining = chunksArray.filter((chunk2) => {\n      return !chunksSeen.includes(chunk2);\n    });\n    const currentScrollPosition = window.scrollY;\n    const closestChunk = chunksRemaining.reduce((closest, current) => {\n      const currentChunkTop = viewportHeight * current;\n      const closestChunkTop = viewportHeight * closest;\n      return Math.abs(currentScrollPosition - currentChunkTop) < Math.abs(currentScrollPosition - closestChunkTop) ? current : closest;\n    }, chunksRemaining[0]);\n    const chunk = closestChunk;\n    if (chunk === void 0) {\n      throw new Error(`No chunks remaining to check: ${chunksRemaining}`);\n    }\n    return {\n      chunk,\n      chunksArray\n    };\n  }\n\n  // lib/dom/debug.ts\n  async function debugDom() {\n    window.chunkNumber = 0;\n    const container = new GlobalPageContainer();\n    const chunkSize = container.getViewportHeight();\n    const startOffset = container.getScrollPosition();\n    const endOffset = startOffset;\n    const singleChunks = await container.collectDomChunks(\n      startOffset,\n      endOffset,\n      chunkSize,\n      false,\n      false,\n      // Don\'t scroll back to top\n      container.getRootElement()\n      // BFS entire doc\n    );\n    const [singleChunk] = singleChunks;\n    if (!singleChunk) {\n      console.warn("No chunk was returned. Possibly empty doc?");\n      return;\n    }\n    const multiSelectorMap = singleChunk.selectorMap;\n    const selectorMap = multiSelectorMapToSelectorMap(multiSelectorMap);\n    drawChunk(selectorMap);\n  }\n  function multiSelectorMapToSelectorMap(multiSelectorMap) {\n    return Object.fromEntries(\n      Object.entries(multiSelectorMap).map(([key, selectors]) => [\n        Number(key),\n        selectors[0]\n      ])\n    );\n  }\n  function drawChunk(selectorMap) {\n    if (!window.showChunks) return;\n    cleanupMarkers();\n    Object.values(selectorMap).forEach((selector) => {\n      const element = getNodeFromXpath(selector);\n      if (element) {\n        let rect;\n        if (element.nodeType === Node.ELEMENT_NODE) {\n          rect = element.getBoundingClientRect();\n        } else {\n          const range = document.createRange();\n          range.selectNodeContents(element);\n          rect = range.getBoundingClientRect();\n        }\n        const color = "grey";\n        const overlay = document.createElement("div");\n        overlay.style.position = "absolute";\n        overlay.style.left = `${rect.left + window.scrollX}px`;\n        overlay.style.top = `${rect.top + window.scrollY}px`;\n        overlay.style.padding = "2px";\n        overlay.style.width = `${rect.width}px`;\n        overlay.style.height = `${rect.height}px`;\n        overlay.style.backgroundColor = color;\n        overlay.className = "stagehand-marker";\n        overlay.style.opacity = "0.3";\n        overlay.style.zIndex = "1000000000";\n        overlay.style.border = "1px solid";\n        overlay.style.pointerEvents = "none";\n        document.body.appendChild(overlay);\n      }\n    });\n  }\n  async function cleanupDebug() {\n    cleanupMarkers();\n  }\n  function cleanupMarkers() {\n    const markers = document.querySelectorAll(".stagehand-marker");\n    markers.forEach((marker) => {\n      marker.remove();\n    });\n  }\n  window.debugDom = debugDom;\n  window.cleanupDebug = cleanupDebug;\n})();\n';

// lib/cache/LLMCache.ts
var LLMCache = class _LLMCache extends BaseCache {
  constructor(logger, cacheDir, cacheFile) {
    super(logger, cacheDir, cacheFile || "llm_calls.json");
  }
  /**
   * Overrides the get method to track used hashes by requestId.
   * @param options - The options used to generate the cache key.
   * @param requestId - The identifier for the current request.
   * @returns The cached data if available, otherwise null.
   */
  get(options, requestId) {
    return __async(this, null, function* () {
      const data = yield __superGet(_LLMCache.prototype, this, "get").call(this, options, requestId);
      return data;
    });
  }
  /**
   * Overrides the set method to include cache cleanup logic.
   * @param options - The options used to generate the cache key.
   * @param data - The data to be cached.
   * @param requestId - The identifier for the current request.
   */
  set(options, data, requestId) {
    return __async(this, null, function* () {
      yield __superGet(_LLMCache.prototype, this, "set").call(this, options, data, requestId);
      this.logger({
        category: "llm_cache",
        message: "Cache miss - saved new response",
        level: 1
      });
    });
  }
};

// lib/llm/AnthropicClient.ts
var import_sdk2 = __toESM(require("@anthropic-ai/sdk"));
var import_zod_to_json_schema2 = require("zod-to-json-schema");

// lib/llm/LLMClient.ts
var AnnotatedScreenshotText = "This is a screenshot of the current page state with the elements annotated on it. Each element id is annotated with a number to the top left of it. Duplicate annotations at the same location are under each other vertically.";
var LLMClient = class {
  constructor(modelName, userProvidedInstructions) {
    this.modelName = modelName;
    this.userProvidedInstructions = userProvidedInstructions;
  }
};

// lib/llm/AnthropicClient.ts
var AnthropicClient = class extends LLMClient {
  constructor({
    enableCaching = false,
    cache,
    modelName,
    clientOptions,
    userProvidedInstructions
  }) {
    super(modelName);
    this.type = "anthropic";
    this.client = new import_sdk2.default(clientOptions);
    this.cache = cache;
    this.enableCaching = enableCaching;
    this.modelName = modelName;
    this.clientOptions = clientOptions;
    this.userProvidedInstructions = userProvidedInstructions;
  }
  createChatCompletion(_0) {
    return __async(this, arguments, function* ({
      options,
      retries,
      logger
    }) {
      var _a, _b;
      const optionsWithoutImage = __spreadValues({}, options);
      delete optionsWithoutImage.image;
      logger({
        category: "anthropic",
        message: "creating chat completion",
        level: 1,
        auxiliary: {
          options: {
            value: JSON.stringify(optionsWithoutImage),
            type: "object"
          }
        }
      });
      const cacheOptions = {
        model: this.modelName,
        messages: options.messages,
        temperature: options.temperature,
        image: options.image,
        response_model: options.response_model,
        tools: options.tools,
        retries
      };
      if (this.enableCaching) {
        const cachedResponse = yield this.cache.get(
          cacheOptions,
          options.requestId
        );
        if (cachedResponse) {
          logger({
            category: "llm_cache",
            message: "LLM cache hit - returning cached response",
            level: 1,
            auxiliary: {
              cachedResponse: {
                value: JSON.stringify(cachedResponse),
                type: "object"
              },
              requestId: {
                value: options.requestId,
                type: "string"
              },
              cacheOptions: {
                value: JSON.stringify(cacheOptions),
                type: "object"
              }
            }
          });
          return cachedResponse;
        } else {
          logger({
            category: "llm_cache",
            message: "LLM cache miss - no cached response found",
            level: 1,
            auxiliary: {
              cacheOptions: {
                value: JSON.stringify(cacheOptions),
                type: "object"
              },
              requestId: {
                value: options.requestId,
                type: "string"
              }
            }
          });
        }
      }
      const systemMessage = options.messages.find((msg) => {
        if (msg.role === "system") {
          if (typeof msg.content === "string") {
            return true;
          } else if (Array.isArray(msg.content)) {
            return msg.content.every((content) => content.type !== "image_url");
          }
        }
        return false;
      });
      const userMessages = options.messages.filter(
        (msg) => msg.role !== "system"
      );
      const formattedMessages = userMessages.map((msg) => {
        if (typeof msg.content === "string") {
          return {
            role: msg.role,
            // ensure its not checking for system types
            content: msg.content
          };
        } else {
          return {
            role: msg.role,
            content: msg.content.map((content) => {
              if ("image_url" in content) {
                const formattedContent = {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/jpeg",
                    data: content.image_url.url
                  }
                };
                return formattedContent;
              } else {
                return { type: "text", text: content.text };
              }
            })
          };
        }
      });
      if (options.image) {
        const screenshotMessage = {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: options.image.buffer.toString("base64")
              }
            }
          ]
        };
        if (options.image.description && Array.isArray(screenshotMessage.content)) {
          screenshotMessage.content.push({
            type: "text",
            text: options.image.description
          });
        }
        formattedMessages.push(screenshotMessage);
      }
      let anthropicTools = (_a = options.tools) == null ? void 0 : _a.map((tool) => {
        return {
          name: tool.name,
          description: tool.description,
          input_schema: {
            type: "object",
            properties: tool.parameters.properties,
            required: tool.parameters.required
          }
        };
      });
      let toolDefinition;
      if (options.response_model) {
        const jsonSchema = (0, import_zod_to_json_schema2.zodToJsonSchema)(options.response_model.schema);
        const { properties: schemaProperties, required: schemaRequired } = extractSchemaProperties(jsonSchema);
        toolDefinition = {
          name: "print_extracted_data",
          description: "Prints the extracted data based on the provided schema.",
          input_schema: {
            type: "object",
            properties: schemaProperties,
            required: schemaRequired
          }
        };
      }
      if (toolDefinition) {
        anthropicTools = anthropicTools != null ? anthropicTools : [];
        anthropicTools.push(toolDefinition);
      }
      const response = yield this.client.messages.create({
        model: this.modelName,
        max_tokens: options.maxTokens || 8192,
        messages: formattedMessages,
        tools: anthropicTools,
        system: systemMessage ? systemMessage.content : void 0,
        temperature: options.temperature
      });
      logger({
        category: "anthropic",
        message: "response",
        level: 1,
        auxiliary: {
          response: {
            value: JSON.stringify(response),
            type: "object"
          },
          requestId: {
            value: options.requestId,
            type: "string"
          }
        }
      });
      const transformedResponse = {
        id: response.id,
        object: "chat.completion",
        created: Date.now(),
        model: response.model,
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: ((_b = response.content.find((c) => c.type === "text")) == null ? void 0 : _b.text) || null,
              tool_calls: response.content.filter((c) => c.type === "tool_use").map((toolUse) => ({
                id: toolUse.id,
                type: "function",
                function: {
                  name: toolUse.name,
                  arguments: JSON.stringify(toolUse.input)
                }
              }))
            },
            finish_reason: response.stop_reason
          }
        ],
        usage: {
          prompt_tokens: response.usage.input_tokens,
          completion_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };
      logger({
        category: "anthropic",
        message: "transformed response",
        level: 1,
        auxiliary: {
          transformedResponse: {
            value: JSON.stringify(transformedResponse),
            type: "object"
          },
          requestId: {
            value: options.requestId,
            type: "string"
          }
        }
      });
      if (options.response_model) {
        const toolUse = response.content.find((c) => c.type === "tool_use");
        if (toolUse && "input" in toolUse) {
          const result = toolUse.input;
          if (this.enableCaching) {
            this.cache.set(cacheOptions, result, options.requestId);
          }
          return result;
        } else {
          if (!retries || retries < 5) {
            return this.createChatCompletion({
              options,
              logger,
              retries: (retries != null ? retries : 0) + 1
            });
          }
          logger({
            category: "anthropic",
            message: "error creating chat completion",
            level: 1,
            auxiliary: {
              requestId: {
                value: options.requestId,
                type: "string"
              }
            }
          });
          throw new Error(
            "Create Chat Completion Failed: No tool use with input in response"
          );
        }
      }
      if (this.enableCaching) {
        this.cache.set(cacheOptions, transformedResponse, options.requestId);
        logger({
          category: "anthropic",
          message: "cached response",
          level: 1,
          auxiliary: {
            requestId: {
              value: options.requestId,
              type: "string"
            },
            transformedResponse: {
              value: JSON.stringify(transformedResponse),
              type: "object"
            },
            cacheOptions: {
              value: JSON.stringify(cacheOptions),
              type: "object"
            }
          }
        });
      }
      return transformedResponse;
    });
  }
};
var extractSchemaProperties = (jsonSchema) => {
  var _a;
  const schemaRoot = ((_a = jsonSchema.definitions) == null ? void 0 : _a.MySchema) || jsonSchema;
  return {
    properties: schemaRoot.properties,
    required: schemaRoot.required
  };
};

// lib/llm/CerebrasClient.ts
var import_openai = __toESM(require("openai"));
var import_zod_to_json_schema3 = require("zod-to-json-schema");
var CerebrasClient = class extends LLMClient {
  constructor({
    enableCaching = false,
    cache,
    modelName,
    clientOptions,
    userProvidedInstructions
  }) {
    super(modelName, userProvidedInstructions);
    this.type = "cerebras";
    this.hasVision = false;
    this.client = new import_openai.default(__spreadValues({
      baseURL: "https://api.cerebras.ai/v1",
      apiKey: (clientOptions == null ? void 0 : clientOptions.apiKey) || process.env.CEREBRAS_API_KEY
    }, clientOptions));
    this.cache = cache;
    this.enableCaching = enableCaching;
    this.modelName = modelName;
    this.clientOptions = clientOptions;
  }
  createChatCompletion(_0) {
    return __async(this, arguments, function* ({
      options,
      retries,
      logger
    }) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
      const optionsWithoutImage = __spreadValues({}, options);
      delete optionsWithoutImage.image;
      logger({
        category: "cerebras",
        message: "creating chat completion",
        level: 1,
        auxiliary: {
          options: {
            value: JSON.stringify(optionsWithoutImage),
            type: "object"
          }
        }
      });
      const cacheOptions = {
        model: this.modelName.split("cerebras-")[1],
        messages: options.messages,
        temperature: options.temperature,
        response_model: options.response_model,
        tools: options.tools,
        retries
      };
      if (this.enableCaching) {
        const cachedResponse = yield this.cache.get(
          cacheOptions,
          options.requestId
        );
        if (cachedResponse) {
          logger({
            category: "llm_cache",
            message: "LLM cache hit - returning cached response",
            level: 1,
            auxiliary: {
              cachedResponse: {
                value: JSON.stringify(cachedResponse),
                type: "object"
              },
              requestId: {
                value: options.requestId,
                type: "string"
              },
              cacheOptions: {
                value: JSON.stringify(cacheOptions),
                type: "object"
              }
            }
          });
          return cachedResponse;
        }
      }
      const formattedMessages = options.messages.map((msg) => {
        const baseMessage = {
          content: typeof msg.content === "string" ? msg.content : Array.isArray(msg.content) && msg.content.length > 0 && "text" in msg.content[0] ? msg.content[0].text : ""
        };
        if (msg.role === "system") {
          return __spreadProps(__spreadValues({}, baseMessage), { role: "system" });
        } else if (msg.role === "assistant") {
          return __spreadProps(__spreadValues({}, baseMessage), { role: "assistant" });
        } else {
          return __spreadProps(__spreadValues({}, baseMessage), { role: "user" });
        }
      });
      let tools = (_a = options.tools) == null ? void 0 : _a.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: tool.parameters.properties,
            required: tool.parameters.required
          }
        }
      }));
      if (options.response_model) {
        const jsonSchema = (0, import_zod_to_json_schema3.zodToJsonSchema)(options.response_model.schema);
        const schemaProperties = jsonSchema.properties || {};
        const schemaRequired = jsonSchema.required || [];
        const responseTool = {
          type: "function",
          function: {
            name: "print_extracted_data",
            description: "Prints the extracted data based on the provided schema.",
            parameters: {
              type: "object",
              properties: schemaProperties,
              required: schemaRequired
            }
          }
        };
        tools = tools ? [...tools, responseTool] : [responseTool];
      }
      try {
        const apiResponse = yield this.client.chat.completions.create({
          model: this.modelName.split("cerebras-")[1],
          messages: [
            ...formattedMessages,
            // Add explicit instruction to return JSON if we have a response model
            ...options.response_model ? [
              {
                role: "system",
                content: `IMPORTANT: Your response must be valid JSON that matches this schema: ${JSON.stringify(options.response_model.schema)}`
              }
            ] : []
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens,
          tools,
          tool_choice: options.tool_choice || "auto"
        });
        const response = {
          id: apiResponse.id,
          object: "chat.completion",
          created: Date.now(),
          model: this.modelName.split("cerebras-")[1],
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: ((_c = (_b = apiResponse.choices[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || null,
                tool_calls: ((_e = (_d = apiResponse.choices[0]) == null ? void 0 : _d.message) == null ? void 0 : _e.tool_calls) || []
              },
              finish_reason: ((_f = apiResponse.choices[0]) == null ? void 0 : _f.finish_reason) || "stop"
            }
          ],
          usage: {
            prompt_tokens: ((_g = apiResponse.usage) == null ? void 0 : _g.prompt_tokens) || 0,
            completion_tokens: ((_h = apiResponse.usage) == null ? void 0 : _h.completion_tokens) || 0,
            total_tokens: ((_i = apiResponse.usage) == null ? void 0 : _i.total_tokens) || 0
          }
        };
        logger({
          category: "cerebras",
          message: "response",
          level: 1,
          auxiliary: {
            response: {
              value: JSON.stringify(response),
              type: "object"
            },
            requestId: {
              value: options.requestId,
              type: "string"
            }
          }
        });
        if (options.response_model) {
          const toolCall = (_l = (_k = (_j = response.choices[0]) == null ? void 0 : _j.message) == null ? void 0 : _k.tool_calls) == null ? void 0 : _l[0];
          if ((_m = toolCall == null ? void 0 : toolCall.function) == null ? void 0 : _m.arguments) {
            try {
              const result = JSON.parse(toolCall.function.arguments);
              if (this.enableCaching) {
                this.cache.set(cacheOptions, result, options.requestId);
              }
              return result;
            } catch (e) {
              logger({
                category: "cerebras",
                message: "failed to parse tool call arguments as JSON, retrying",
                level: 1,
                auxiliary: {
                  error: {
                    value: e.message,
                    type: "string"
                  }
                }
              });
            }
          }
          const content = (_o = (_n = response.choices[0]) == null ? void 0 : _n.message) == null ? void 0 : _o.content;
          if (content) {
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                if (this.enableCaching) {
                  this.cache.set(cacheOptions, result, options.requestId);
                }
                return result;
              }
            } catch (e) {
              logger({
                category: "cerebras",
                message: "failed to parse content as JSON",
                level: 1,
                auxiliary: {
                  error: {
                    value: e.message,
                    type: "string"
                  }
                }
              });
            }
          }
          if (!retries || retries < 5) {
            return this.createChatCompletion({
              options,
              logger,
              retries: (retries != null ? retries : 0) + 1
            });
          }
          throw new Error(
            "Create Chat Completion Failed: Could not extract valid JSON from response"
          );
        }
        if (this.enableCaching) {
          this.cache.set(cacheOptions, response, options.requestId);
        }
        return response;
      } catch (error) {
        logger({
          category: "cerebras",
          message: "error creating chat completion",
          level: 1,
          auxiliary: {
            error: {
              value: error.message,
              type: "string"
            },
            requestId: {
              value: options.requestId,
              type: "string"
            }
          }
        });
        throw error;
      }
    });
  }
};

// lib/llm/GroqClient.ts
var import_openai2 = __toESM(require("openai"));
var import_zod_to_json_schema4 = require("zod-to-json-schema");
var GroqClient = class extends LLMClient {
  constructor({
    enableCaching = false,
    cache,
    modelName,
    clientOptions,
    userProvidedInstructions
  }) {
    super(modelName, userProvidedInstructions);
    this.type = "groq";
    this.hasVision = false;
    this.client = new import_openai2.default(__spreadValues({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: (clientOptions == null ? void 0 : clientOptions.apiKey) || process.env.GROQ_API_KEY
    }, clientOptions));
    this.cache = cache;
    this.enableCaching = enableCaching;
    this.modelName = modelName;
    this.clientOptions = clientOptions;
  }
  createChatCompletion(_0) {
    return __async(this, arguments, function* ({
      options,
      retries,
      logger
    }) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
      const optionsWithoutImage = __spreadValues({}, options);
      delete optionsWithoutImage.image;
      logger({
        category: "groq",
        message: "creating chat completion",
        level: 1,
        auxiliary: {
          options: {
            value: JSON.stringify(optionsWithoutImage),
            type: "object"
          }
        }
      });
      const cacheOptions = {
        model: this.modelName.split("groq-")[1],
        messages: options.messages,
        temperature: options.temperature,
        response_model: options.response_model,
        tools: options.tools,
        retries
      };
      if (this.enableCaching) {
        const cachedResponse = yield this.cache.get(
          cacheOptions,
          options.requestId
        );
        if (cachedResponse) {
          logger({
            category: "llm_cache",
            message: "LLM cache hit - returning cached response",
            level: 1,
            auxiliary: {
              cachedResponse: {
                value: JSON.stringify(cachedResponse),
                type: "object"
              },
              requestId: {
                value: options.requestId,
                type: "string"
              },
              cacheOptions: {
                value: JSON.stringify(cacheOptions),
                type: "object"
              }
            }
          });
          return cachedResponse;
        }
      }
      const formattedMessages = options.messages.map((msg) => {
        const baseMessage = {
          content: typeof msg.content === "string" ? msg.content : Array.isArray(msg.content) && msg.content.length > 0 && "text" in msg.content[0] ? msg.content[0].text : ""
        };
        if (msg.role === "system") {
          return __spreadProps(__spreadValues({}, baseMessage), { role: "system" });
        } else if (msg.role === "assistant") {
          return __spreadProps(__spreadValues({}, baseMessage), { role: "assistant" });
        } else {
          return __spreadProps(__spreadValues({}, baseMessage), { role: "user" });
        }
      });
      let tools = (_a = options.tools) == null ? void 0 : _a.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: {
            type: "object",
            properties: tool.parameters.properties,
            required: tool.parameters.required
          }
        }
      }));
      if (options.response_model) {
        const jsonSchema = (0, import_zod_to_json_schema4.zodToJsonSchema)(options.response_model.schema);
        const schemaProperties = jsonSchema.properties || {};
        const schemaRequired = jsonSchema.required || [];
        const responseTool = {
          type: "function",
          function: {
            name: "print_extracted_data",
            description: "Prints the extracted data based on the provided schema.",
            parameters: {
              type: "object",
              properties: schemaProperties,
              required: schemaRequired
            }
          }
        };
        tools = tools ? [...tools, responseTool] : [responseTool];
      }
      try {
        const apiResponse = yield this.client.chat.completions.create({
          model: this.modelName.split("groq-")[1],
          messages: [
            ...formattedMessages,
            // Add explicit instruction to return JSON if we have a response model
            ...options.response_model ? [
              {
                role: "system",
                content: `IMPORTANT: Your response must be valid JSON that matches this schema: ${JSON.stringify(options.response_model.schema)}`
              }
            ] : []
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens,
          tools,
          tool_choice: options.tool_choice || "auto"
        });
        const response = {
          id: apiResponse.id,
          object: "chat.completion",
          created: Date.now(),
          model: this.modelName.split("groq-")[1],
          choices: [
            {
              index: 0,
              message: {
                role: "assistant",
                content: ((_c = (_b = apiResponse.choices[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || null,
                tool_calls: ((_e = (_d = apiResponse.choices[0]) == null ? void 0 : _d.message) == null ? void 0 : _e.tool_calls) || []
              },
              finish_reason: ((_f = apiResponse.choices[0]) == null ? void 0 : _f.finish_reason) || "stop"
            }
          ],
          usage: {
            prompt_tokens: ((_g = apiResponse.usage) == null ? void 0 : _g.prompt_tokens) || 0,
            completion_tokens: ((_h = apiResponse.usage) == null ? void 0 : _h.completion_tokens) || 0,
            total_tokens: ((_i = apiResponse.usage) == null ? void 0 : _i.total_tokens) || 0
          }
        };
        logger({
          category: "groq",
          message: "response",
          level: 1,
          auxiliary: {
            response: {
              value: JSON.stringify(response),
              type: "object"
            },
            requestId: {
              value: options.requestId,
              type: "string"
            }
          }
        });
        if (options.response_model) {
          const toolCall = (_l = (_k = (_j = response.choices[0]) == null ? void 0 : _j.message) == null ? void 0 : _k.tool_calls) == null ? void 0 : _l[0];
          if ((_m = toolCall == null ? void 0 : toolCall.function) == null ? void 0 : _m.arguments) {
            try {
              const result = JSON.parse(toolCall.function.arguments);
              if (this.enableCaching) {
                this.cache.set(cacheOptions, result, options.requestId);
              }
              return result;
            } catch (e) {
              logger({
                category: "groq",
                message: "failed to parse tool call arguments as JSON, retrying",
                level: 1,
                auxiliary: {
                  error: {
                    value: e.message,
                    type: "string"
                  }
                }
              });
            }
          }
          const content = (_o = (_n = response.choices[0]) == null ? void 0 : _n.message) == null ? void 0 : _o.content;
          if (content) {
            try {
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                if (this.enableCaching) {
                  this.cache.set(cacheOptions, result, options.requestId);
                }
                return result;
              }
            } catch (e) {
              logger({
                category: "groq",
                message: "failed to parse content as JSON",
                level: 1,
                auxiliary: {
                  error: {
                    value: e.message,
                    type: "string"
                  }
                }
              });
            }
          }
          if (!retries || retries < 5) {
            return this.createChatCompletion({
              options,
              logger,
              retries: (retries != null ? retries : 0) + 1
            });
          }
          throw new Error(
            "Create Chat Completion Failed: Could not extract valid JSON from response"
          );
        }
        if (this.enableCaching) {
          this.cache.set(cacheOptions, response, options.requestId);
        }
        return response;
      } catch (error) {
        logger({
          category: "groq",
          message: "error creating chat completion",
          level: 1,
          auxiliary: {
            error: {
              value: error.message,
              type: "string"
            },
            requestId: {
              value: options.requestId,
              type: "string"
            }
          }
        });
        throw error;
      }
    });
  }
};

// lib/llm/OpenAIClient.ts
var import_openai3 = __toESM(require("openai"));
var import_zod3 = require("openai/helpers/zod");
var import_zod_to_json_schema5 = __toESM(require("zod-to-json-schema"));
var OpenAIClient = class extends LLMClient {
  constructor({
    enableCaching = false,
    cache,
    modelName,
    clientOptions
  }) {
    super(modelName);
    this.type = "openai";
    this.clientOptions = clientOptions;
    this.client = new import_openai3.default(clientOptions);
    this.cache = cache;
    this.enableCaching = enableCaching;
    this.modelName = modelName;
  }
  createChatCompletion(_0) {
    return __async(this, arguments, function* ({
      options: optionsInitial,
      logger,
      retries = 3
    }) {
      var _a, _b, _e;
      let options = optionsInitial;
      let isToolsOverridedForO1 = false;
      if (this.modelName.startsWith("o1") || this.modelName.startsWith("o3")) {
        let {
          tool_choice,
          top_p,
          frequency_penalty,
          presence_penalty,
          temperature
        } = options;
        _a = options, {
          tool_choice,
          top_p,
          frequency_penalty,
          presence_penalty,
          temperature
        } = _a, options = __objRest(_a, [
          "tool_choice",
          "top_p",
          "frequency_penalty",
          "presence_penalty",
          "temperature"
        ]);
        options.messages = options.messages.map((message) => __spreadProps(__spreadValues({}, message), {
          role: "user"
        }));
        if (options.tools && options.response_model) {
          throw new Error(
            "Cannot use both tool and response_model for o1 models"
          );
        }
        if (options.tools) {
          let { tools } = options;
          _b = options, { tools } = _b, options = __objRest(_b, ["tools"]);
          isToolsOverridedForO1 = true;
          options.messages.push({
            role: "user",
            content: `You have the following tools available to you:
${JSON.stringify(
              tools
            )}

          Respond with the following zod schema format to use a method: {
            "name": "<tool_name>",
            "arguments": <tool_args>
          }
          
          Do not include any other text or formattings like \`\`\` in your response. Just the JSON object.`
          });
        }
      }
      if (options.temperature && (this.modelName.startsWith("o1") || this.modelName.startsWith("o3"))) {
        throw new Error("Temperature is not supported for o1 models");
      }
      const _c = options, { image, requestId } = _c, optionsWithoutImageAndRequestId = __objRest(_c, ["image", "requestId"]);
      logger({
        category: "openai",
        message: "creating chat completion",
        level: 1,
        auxiliary: {
          options: {
            value: JSON.stringify(__spreadProps(__spreadValues({}, optionsWithoutImageAndRequestId), {
              requestId
            })),
            type: "object"
          },
          modelName: {
            value: this.modelName,
            type: "string"
          }
        }
      });
      const cacheOptions = {
        model: this.modelName,
        messages: options.messages,
        temperature: options.temperature,
        top_p: options.top_p,
        frequency_penalty: options.frequency_penalty,
        presence_penalty: options.presence_penalty,
        image,
        response_model: options.response_model
      };
      if (this.enableCaching) {
        const cachedResponse = yield this.cache.get(
          cacheOptions,
          options.requestId
        );
        if (cachedResponse) {
          logger({
            category: "llm_cache",
            message: "LLM cache hit - returning cached response",
            level: 1,
            auxiliary: {
              requestId: {
                value: options.requestId,
                type: "string"
              },
              cachedResponse: {
                value: JSON.stringify(cachedResponse),
                type: "object"
              }
            }
          });
          return cachedResponse;
        } else {
          logger({
            category: "llm_cache",
            message: "LLM cache miss - no cached response found",
            level: 1,
            auxiliary: {
              requestId: {
                value: options.requestId,
                type: "string"
              }
            }
          });
        }
      }
      if (options.image) {
        const screenshotMessage = {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${options.image.buffer.toString("base64")}`
              }
            },
            ...options.image.description ? [{ type: "text", text: options.image.description }] : []
          ]
        };
        options.messages.push(screenshotMessage);
      }
      let responseFormat = void 0;
      if (options.response_model) {
        if (this.modelName.startsWith("o1") || this.modelName.startsWith("o3")) {
          try {
            const parsedSchema = JSON.stringify(
              (0, import_zod_to_json_schema5.default)(options.response_model.schema)
            );
            options.messages.push({
              role: "user",
              content: `Respond in this zod schema format:
${parsedSchema}


          Do not include any other text, formatting or markdown in your output. Do not include \`\`\` or \`\`\`json in your response. Only the JSON object itself.`
            });
          } catch (error) {
            logger({
              category: "openai",
              message: "Failed to parse response model schema",
              level: 0
            });
            if (retries > 0) {
              return this.createChatCompletion({
                options,
                logger,
                retries: retries - 1
              });
            }
            throw error;
          }
        } else {
          responseFormat = (0, import_zod3.zodResponseFormat)(
            options.response_model.schema,
            options.response_model.name
          );
        }
      }
      const _d = __spreadProps(__spreadValues({}, optionsWithoutImageAndRequestId), {
        model: this.modelName
      }), { response_model } = _d, openAiOptions = __objRest(_d, ["response_model"]);
      logger({
        category: "openai",
        message: "creating chat completion",
        level: 1,
        auxiliary: {
          openAiOptions: {
            value: JSON.stringify(openAiOptions),
            type: "object"
          }
        }
      });
      const formattedMessages = options.messages.map((message) => {
        if (Array.isArray(message.content)) {
          const contentParts = message.content.map((content) => {
            if ("image_url" in content) {
              const imageContent = {
                image_url: {
                  url: content.image_url.url
                },
                type: "image_url"
              };
              return imageContent;
            } else {
              const textContent = {
                text: content.text,
                type: "text"
              };
              return textContent;
            }
          });
          if (message.role === "system") {
            const formattedMessage2 = __spreadProps(__spreadValues({}, message), {
              role: "system",
              content: contentParts.filter(
                (content) => content.type === "text"
              )
            });
            return formattedMessage2;
          } else if (message.role === "user") {
            const formattedMessage2 = __spreadProps(__spreadValues({}, message), {
              role: "user",
              content: contentParts
            });
            return formattedMessage2;
          } else {
            const formattedMessage2 = __spreadProps(__spreadValues({}, message), {
              role: "assistant",
              content: contentParts.filter(
                (content) => content.type === "text"
              )
            });
            return formattedMessage2;
          }
        }
        const formattedMessage = {
          role: "user",
          content: message.content
        };
        return formattedMessage;
      });
      const body = __spreadProps(__spreadValues({}, openAiOptions), {
        model: this.modelName,
        messages: formattedMessages,
        response_format: responseFormat,
        stream: false,
        tools: (_e = options.tools) == null ? void 0 : _e.map((tool) => ({
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
          },
          type: "function"
        }))
      });
      const response = yield this.client.chat.completions.create(body);
      if (isToolsOverridedForO1) {
        try {
          const parsedContent = JSON.parse(response.choices[0].message.content);
          response.choices[0].message.tool_calls = [
            {
              function: {
                name: parsedContent["name"],
                arguments: JSON.stringify(parsedContent["arguments"])
              },
              type: "function",
              id: "-1"
            }
          ];
          response.choices[0].message.content = null;
        } catch (error) {
          logger({
            category: "openai",
            message: "Failed to parse tool call response",
            level: 0,
            auxiliary: {
              error: {
                value: error.message,
                type: "string"
              },
              content: {
                value: response.choices[0].message.content,
                type: "string"
              }
            }
          });
          if (retries > 0) {
            return this.createChatCompletion({
              options,
              logger,
              retries: retries - 1
            });
          }
          throw error;
        }
      }
      logger({
        category: "openai",
        message: "response",
        level: 1,
        auxiliary: {
          response: {
            value: JSON.stringify(response),
            type: "object"
          },
          requestId: {
            value: requestId,
            type: "string"
          }
        }
      });
      if (options.response_model) {
        const extractedData = response.choices[0].message.content;
        const parsedData = JSON.parse(extractedData);
        if (!validateZodSchema(options.response_model.schema, parsedData)) {
          if (retries > 0) {
            return this.createChatCompletion({
              options,
              logger,
              retries: retries - 1
            });
          }
          throw new Error("Invalid response schema");
        }
        if (this.enableCaching) {
          this.cache.set(
            cacheOptions,
            __spreadValues({}, parsedData),
            options.requestId
          );
        }
        return parsedData;
      }
      if (this.enableCaching) {
        logger({
          category: "llm_cache",
          message: "caching response",
          level: 1,
          auxiliary: {
            requestId: {
              value: options.requestId,
              type: "string"
            },
            cacheOptions: {
              value: JSON.stringify(cacheOptions),
              type: "object"
            },
            response: {
              value: JSON.stringify(response),
              type: "object"
            }
          }
        });
        this.cache.set(cacheOptions, response, options.requestId);
      }
      return response;
    });
  }
};

// lib/llm/LLMProvider.ts
var modelToProviderMap = {
  "gpt-4o": "openai",
  "gpt-4o-mini": "openai",
  "gpt-4o-2024-08-06": "openai",
  "gpt-4.5-preview": "openai",
  "o1-mini": "openai",
  "o1-preview": "openai",
  "o3-mini": "openai",
  "claude-3-5-sonnet-latest": "anthropic",
  "claude-3-5-sonnet-20240620": "anthropic",
  "claude-3-5-sonnet-20241022": "anthropic",
  "claude-3-7-sonnet-20250219": "anthropic",
  "claude-3-7-sonnet-latest": "anthropic",
  "cerebras-llama-3.3-70b": "cerebras",
  "cerebras-llama-3.1-8b": "cerebras",
  "groq-llama-3.3-70b-versatile": "groq",
  "groq-llama-3.3-70b-specdec": "groq"
};
var LLMProvider = class {
  constructor(logger, enableCaching) {
    this.logger = logger;
    this.enableCaching = enableCaching;
    this.cache = enableCaching ? new LLMCache(logger) : void 0;
  }
  cleanRequestCache(requestId) {
    if (!this.enableCaching) {
      return;
    }
    this.logger({
      category: "llm_cache",
      message: "cleaning up cache",
      level: 1,
      auxiliary: {
        requestId: {
          value: requestId,
          type: "string"
        }
      }
    });
    this.cache.deleteCacheForRequestId(requestId);
  }
  getClient(modelName, clientOptions) {
    const provider = modelToProviderMap[modelName];
    if (!provider) {
      throw new Error(`Unsupported model: ${modelName}`);
    }
    switch (provider) {
      case "openai":
        return new OpenAIClient({
          logger: this.logger,
          enableCaching: this.enableCaching,
          cache: this.cache,
          modelName,
          clientOptions
        });
      case "anthropic":
        return new AnthropicClient({
          logger: this.logger,
          enableCaching: this.enableCaching,
          cache: this.cache,
          modelName,
          clientOptions
        });
      case "cerebras":
        return new CerebrasClient({
          logger: this.logger,
          enableCaching: this.enableCaching,
          cache: this.cache,
          modelName,
          clientOptions
        });
      case "groq":
        return new GroqClient({
          logger: this.logger,
          enableCaching: this.enableCaching,
          cache: this.cache,
          modelName,
          clientOptions
        });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  static getModelProvider(modelName) {
    const provider = modelToProviderMap[modelName];
    return provider;
  }
};

// types/model.ts
var import_zod4 = require("zod");
var AvailableModelSchema = import_zod4.z.enum([
  "gpt-4o",
  "gpt-4o-mini",
  "gpt-4o-2024-08-06",
  "gpt-4.5-preview",
  "claude-3-5-sonnet-latest",
  "claude-3-5-sonnet-20241022",
  "claude-3-5-sonnet-20240620",
  "claude-3-7-sonnet-latest",
  "claude-3-7-sonnet-20250219",
  "o1-mini",
  "o1-preview",
  "o3-mini",
  "cerebras-llama-3.3-70b",
  "cerebras-llama-3.1-8b",
  "groq-llama-3.3-70b-versatile",
  "groq-llama-3.3-70b-specdec"
]);

// lib/index.ts
import_dotenv.default.config({ path: ".env" });
var DEFAULT_MODEL_NAME = "gpt-4o";
var BROWSERBASE_REGION_DOMAIN2 = {
  "us-west-2": "wss://connect.usw2.browserbase.com",
  "us-east-1": "wss://connect.use1.browserbase.com",
  "eu-central-1": "wss://connect.euc1.browserbase.com",
  "ap-southeast-1": "wss://connect.apse1.browserbase.com"
};
function getBrowser(apiKey, projectId, env = "LOCAL", headless = false, logger, browserbaseSessionCreateParams, browserbaseSessionID, localBrowserLaunchOptions) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r;
    if (env === "BROWSERBASE") {
      if (!apiKey) {
        logger({
          category: "init",
          message: "BROWSERBASE_API_KEY is required to use BROWSERBASE env. Defaulting to LOCAL.",
          level: 0
        });
        env = "LOCAL";
      }
      if (!projectId) {
        logger({
          category: "init",
          message: "BROWSERBASE_PROJECT_ID is required for some Browserbase features that may not work without it.",
          level: 1
        });
      }
    }
    if (env === "BROWSERBASE") {
      if (!apiKey) {
        throw new Error("BROWSERBASE_API_KEY is required.");
      }
      let debugUrl = void 0;
      let sessionUrl = void 0;
      let sessionId;
      let connectUrl;
      const browserbase = new import_sdk3.Browserbase({
        apiKey
      });
      if (browserbaseSessionID) {
        try {
          const sessionStatus = yield browserbase.sessions.retrieve(browserbaseSessionID);
          if (sessionStatus.status !== "RUNNING") {
            throw new Error(
              `Session ${browserbaseSessionID} is not running (status: ${sessionStatus.status})`
            );
          }
          sessionId = browserbaseSessionID;
          const browserbaseDomain = BROWSERBASE_REGION_DOMAIN2[sessionStatus.region] || "wss://connect.browserbase.com";
          connectUrl = `${browserbaseDomain}?apiKey=${apiKey}&sessionId=${sessionId}`;
          logger({
            category: "init",
            message: "resuming existing browserbase session...",
            level: 1,
            auxiliary: {
              sessionId: {
                value: sessionId,
                type: "string"
              }
            }
          });
        } catch (error) {
          logger({
            category: "init",
            message: "failed to resume session",
            level: 1,
            auxiliary: {
              error: {
                value: error.message,
                type: "string"
              },
              trace: {
                value: error.stack,
                type: "string"
              }
            }
          });
          throw error;
        }
      } else {
        logger({
          category: "init",
          message: "creating new browserbase session...",
          level: 0
        });
        if (!projectId) {
          throw new Error(
            "BROWSERBASE_PROJECT_ID is required for new Browserbase sessions."
          );
        }
        const session = yield browserbase.sessions.create(__spreadValues({
          projectId
        }, browserbaseSessionCreateParams));
        sessionId = session.id;
        connectUrl = session.connectUrl;
        logger({
          category: "init",
          message: "created new browserbase session",
          level: 1,
          auxiliary: {
            sessionId: {
              value: sessionId,
              type: "string"
            }
          }
        });
      }
      const browser = yield import_test2.chromium.connectOverCDP(connectUrl);
      const { debuggerUrl } = yield browserbase.sessions.debug(sessionId);
      debugUrl = debuggerUrl;
      sessionUrl = `https://www.browserbase.com/sessions/${sessionId}`;
      logger({
        category: "init",
        message: browserbaseSessionID ? "browserbase session resumed" : "browserbase session started",
        level: 0,
        auxiliary: {
          sessionUrl: {
            value: sessionUrl,
            type: "string"
          },
          debugUrl: {
            value: debugUrl,
            type: "string"
          },
          sessionId: {
            value: sessionId,
            type: "string"
          }
        }
      });
      const context = browser.contexts()[0];
      return { browser, context, debugUrl, sessionUrl, sessionId, env };
    } else {
      logger({
        category: "init",
        message: "launching local browser",
        level: 0,
        auxiliary: {
          headless: {
            value: headless.toString(),
            type: "boolean"
          }
        }
      });
      if (localBrowserLaunchOptions) {
        logger({
          category: "init",
          message: "local browser launch options",
          level: 0,
          auxiliary: {
            localLaunchOptions: {
              value: JSON.stringify(localBrowserLaunchOptions),
              type: "string"
            }
          }
        });
      }
      let userDataDir = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.userDataDir;
      if (!userDataDir) {
        const tmpDirPath = import_path.default.join(import_os.default.tmpdir(), "stagehand");
        if (!import_fs.default.existsSync(tmpDirPath)) {
          import_fs.default.mkdirSync(tmpDirPath, { recursive: true });
        }
        const tmpDir = import_fs.default.mkdtempSync(import_path.default.join(tmpDirPath, "ctx_"));
        import_fs.default.mkdirSync(import_path.default.join(tmpDir, "userdir/Default"), { recursive: true });
        const defaultPreferences = {
          plugins: {
            always_open_pdf_externally: true
          }
        };
        import_fs.default.writeFileSync(
          import_path.default.join(tmpDir, "userdir/Default/Preferences"),
          JSON.stringify(defaultPreferences)
        );
        userDataDir = import_path.default.join(tmpDir, "userdir");
      }
      let downloadsPath = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.downloadsPath;
      if (!downloadsPath) {
        downloadsPath = import_path.default.join(process.cwd(), "downloads");
        import_fs.default.mkdirSync(downloadsPath, { recursive: true });
      }
      const context = yield import_test2.chromium.launchPersistentContext(userDataDir, {
        acceptDownloads: (_a = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.acceptDownloads) != null ? _a : true,
        headless: (_b = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.headless) != null ? _b : headless,
        viewport: {
          width: (_d = (_c = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.viewport) == null ? void 0 : _c.width) != null ? _d : 1250,
          height: (_f = (_e = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.viewport) == null ? void 0 : _e.height) != null ? _f : 800
        },
        locale: (_g = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.locale) != null ? _g : "en-US",
        timezoneId: (_h = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.timezoneId) != null ? _h : "America/New_York",
        deviceScaleFactor: (_i = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.deviceScaleFactor) != null ? _i : 1,
        args: (_j = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.args) != null ? _j : [
          "--enable-webgl",
          "--use-gl=swiftshader",
          "--enable-accelerated-2d-canvas",
          "--disable-blink-features=AutomationControlled",
          "--disable-web-security"
        ],
        bypassCSP: (_k = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.bypassCSP) != null ? _k : true,
        proxy: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.proxy,
        geolocation: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.geolocation,
        hasTouch: (_l = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.hasTouch) != null ? _l : true,
        ignoreHTTPSErrors: (_m = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.ignoreHTTPSErrors) != null ? _m : true,
        permissions: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.permissions,
        recordHar: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.recordHar,
        recordVideo: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.recordVideo,
        tracesDir: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.tracesDir,
        extraHTTPHeaders: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.extraHTTPHeaders,
        chromiumSandbox: (_n = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.chromiumSandbox) != null ? _n : false,
        devtools: (_o = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.devtools) != null ? _o : false,
        env: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.env,
        executablePath: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.executablePath,
        handleSIGHUP: (_p = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.handleSIGHUP) != null ? _p : true,
        handleSIGINT: (_q = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.handleSIGINT) != null ? _q : true,
        handleSIGTERM: (_r = localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.handleSIGTERM) != null ? _r : true,
        ignoreDefaultArgs: localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.ignoreDefaultArgs
      });
      if (localBrowserLaunchOptions == null ? void 0 : localBrowserLaunchOptions.cookies) {
        context.addCookies(localBrowserLaunchOptions.cookies);
      }
      logger({
        category: "init",
        message: "local browser started successfully."
      });
      yield applyStealthScripts(context);
      return { context, contextPath: userDataDir, env: "LOCAL" };
    }
  });
}
function applyStealthScripts(context) {
  return __async(this, null, function* () {
    yield context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => void 0
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"]
      });
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5]
      });
      delete window.__playwright;
      delete window.__pw_manual;
      delete window.__PW_inspect;
      Object.defineProperty(navigator, "headless", {
        get: () => false
      });
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => parameters.name === "notifications" ? Promise.resolve({
        state: Notification.permission
      }) : originalQuery(parameters);
    });
  });
}
var defaultLogger = (logLine) => __async(void 0, null, function* () {
  console.log(logLineToString(logLine));
});
var Stagehand = class {
  constructor({
    env,
    apiKey,
    projectId,
    verbose,
    debugDom,
    llmProvider,
    llmClient,
    headless,
    logger,
    browserbaseSessionCreateParams,
    domSettleTimeoutMs,
    enableCaching,
    browserbaseSessionID,
    modelName,
    modelClientOptions,
    systemPrompt,
    useAPI,
    localBrowserLaunchOptions,
    selfHeal = true,
    waitForCaptchaSolves = false,
    actTimeoutMs = 6e4
  } = {
    env: "BROWSERBASE"
  }) {
    this.cleanupCalled = false;
    this.pending_logs_to_send_to_browserbase = [];
    this.is_processing_browserbase_logs = false;
    this.externalLogger = logger || defaultLogger;
    this.enableCaching = enableCaching != null ? enableCaching : process.env.ENABLE_CACHING && process.env.ENABLE_CACHING === "true";
    this.llmProvider = llmProvider || new LLMProvider(this.logger, this.enableCaching);
    this.intEnv = env;
    this.apiKey = apiKey != null ? apiKey : process.env.BROWSERBASE_API_KEY;
    this.projectId = projectId != null ? projectId : process.env.BROWSERBASE_PROJECT_ID;
    this.verbose = verbose != null ? verbose : 0;
    this.debugDom = debugDom != null ? debugDom : false;
    if (llmClient) {
      this.llmClient = llmClient;
    } else {
      try {
        this.llmClient = this.llmProvider.getClient(
          modelName != null ? modelName : DEFAULT_MODEL_NAME,
          modelClientOptions
        );
      } catch (e) {
        this.llmClient = void 0;
      }
    }
    this.domSettleTimeoutMs = domSettleTimeoutMs != null ? domSettleTimeoutMs : 3e4;
    this.headless = headless != null ? headless : false;
    this.browserbaseSessionCreateParams = browserbaseSessionCreateParams;
    this.browserbaseSessionID = browserbaseSessionID;
    this.userProvidedInstructions = systemPrompt;
    this.usingAPI = useAPI != null ? useAPI : false;
    this.modelName = modelName != null ? modelName : DEFAULT_MODEL_NAME;
    this.actTimeoutMs = actTimeoutMs;
    if (this.usingAPI && env === "LOCAL") {
      throw new Error("API mode can only be used with BROWSERBASE environment");
    } else if (this.usingAPI && !process.env.STAGEHAND_API_URL) {
      throw new Error(
        "STAGEHAND_API_URL is required when using the API. Please set it in your environment variables."
      );
    }
    this.waitForCaptchaSolves = waitForCaptchaSolves;
    this.selfHeal = selfHeal;
    this.localBrowserLaunchOptions = localBrowserLaunchOptions;
    if (this.usingAPI) {
      this.registerSignalHandlers();
    }
  }
  setActivePage(page) {
    this.stagehandPage = page;
  }
  get page() {
    if (!this.stagehandContext) {
      throw new Error(
        "Stagehand not initialized. Make sure to await stagehand.init() first."
      );
    }
    return this.stagehandPage.page;
  }
  registerSignalHandlers() {
    const cleanup = (signal) => __async(this, null, function* () {
      if (this.cleanupCalled) return;
      this.cleanupCalled = true;
      console.log(`[${signal}] received. Ending Browserbase session...`);
      try {
        yield this.close();
      } catch (err) {
        console.error("Error ending Browserbase session:", err);
      } finally {
        process.exit(0);
      }
    });
    process.once("SIGINT", () => void cleanup("SIGINT"));
    process.once("SIGTERM", () => void cleanup("SIGTERM"));
  }
  get logger() {
    return (logLine) => {
      this.log(logLine);
    };
  }
  get env() {
    if (this.intEnv === "BROWSERBASE" && this.apiKey && this.projectId) {
      return "BROWSERBASE";
    }
    return "LOCAL";
  }
  get context() {
    if (!this.stagehandContext) {
      throw new Error(
        "Stagehand not initialized. Make sure to await stagehand.init() first."
      );
    }
    return this.stagehandContext.context;
  }
  init(initOptions) {
    return __async(this, null, function* () {
      if (isRunningInBun()) {
        throw new Error(
          "Playwright does not currently support the Bun runtime environment. Please use Node.js instead. For more information, see: https://github.com/microsoft/playwright/issues/27139"
        );
      }
      if (initOptions) {
        console.warn(
          "Passing parameters to init() is deprecated and will be removed in the next major version. Use constructor options instead."
        );
      }
      if (this.usingAPI) {
        this.apiClient = new StagehandAPI({
          apiKey: this.apiKey,
          projectId: this.projectId,
          logger: this.logger
        });
        const { sessionId: sessionId2 } = yield this.apiClient.init({
          modelName: this.modelName,
          modelApiKey: LLMProvider.getModelProvider(this.modelName) === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY,
          domSettleTimeoutMs: this.domSettleTimeoutMs,
          verbose: this.verbose,
          debugDom: this.debugDom,
          systemPrompt: this.userProvidedInstructions,
          browserbaseSessionCreateParams: this.browserbaseSessionCreateParams
        });
        this.browserbaseSessionID = sessionId2;
      }
      const { context, debugUrl, sessionUrl, contextPath, sessionId, env } = yield getBrowser(
        this.apiKey,
        this.projectId,
        this.env,
        this.headless,
        this.logger,
        this.browserbaseSessionCreateParams,
        this.browserbaseSessionID,
        this.localBrowserLaunchOptions
      ).catch((e) => {
        console.error("Error in init:", e);
        const br = {
          context: void 0,
          debugUrl: void 0,
          sessionUrl: void 0,
          sessionId: void 0,
          env: this.env
        };
        return br;
      });
      this.intEnv = env;
      this.contextPath = contextPath;
      this.stagehandContext = yield StagehandContext.init(context, this);
      const defaultPage = (yield this.stagehandContext.getStagehandPages())[0];
      this.stagehandPage = defaultPage;
      if (this.headless) {
        yield this.page.setViewportSize({ width: 1280, height: 720 });
      }
      yield this.context.addInitScript({
        content: scriptContent
      });
      this.browserbaseSessionID = sessionId;
      return { debugUrl, sessionUrl, sessionId };
    });
  }
  /** @deprecated initFromPage is deprecated and will be removed in the next major version. */
  initFromPage(_0) {
    return __async(this, arguments, function* ({
      page
    }) {
      console.warn(
        "initFromPage is deprecated and will be removed in the next major version. To instantiate from a page, use `browserbaseSessionID` in the constructor."
      );
      this.stagehandPage = yield new StagehandPage(
        page,
        this,
        this.stagehandContext,
        this.llmClient
      ).init();
      this.stagehandContext = yield StagehandContext.init(page.context(), this);
      const originalGoto = this.page.goto.bind(this.page);
      this.page.goto = (url, options) => __async(this, null, function* () {
        const result = yield originalGoto(url, options);
        if (this.debugDom) {
          yield this.page.evaluate(() => window.showChunks = this.debugDom);
        }
        yield this.page.waitForLoadState("domcontentloaded");
        yield this.stagehandPage._waitForSettledDom();
        return result;
      });
      if (this.headless) {
        yield this.page.setViewportSize({ width: 1280, height: 720 });
      }
      yield this.context.addInitScript({
        content: scriptContent
      });
      return { context: this.context };
    });
  }
  log(logObj) {
    var _a;
    logObj.level = (_a = logObj.level) != null ? _a : 1;
    if (this.externalLogger) {
      this.externalLogger(logObj);
    }
    this.pending_logs_to_send_to_browserbase.push(__spreadProps(__spreadValues({}, logObj), {
      id: (0, import_crypto2.randomUUID)()
    }));
    this._run_browserbase_log_processing_cycle();
  }
  _run_browserbase_log_processing_cycle() {
    return __async(this, null, function* () {
      if (this.is_processing_browserbase_logs) {
        return;
      }
      this.is_processing_browserbase_logs = true;
      const pending_logs = [...this.pending_logs_to_send_to_browserbase];
      for (const logObj of pending_logs) {
        yield this._log_to_browserbase(logObj);
      }
      this.is_processing_browserbase_logs = false;
    });
  }
  _log_to_browserbase(logObj) {
    return __async(this, null, function* () {
      var _a;
      logObj.level = (_a = logObj.level) != null ? _a : 1;
      if (!this.stagehandPage) {
        return;
      }
      if (this.verbose >= logObj.level) {
        yield this.page.evaluate((logObj2) => {
          const logMessage = logLineToString(logObj2);
          if (logObj2.message.toLowerCase().includes("trace") || logObj2.message.toLowerCase().includes("error:")) {
            console.error(logMessage);
          } else {
            console.log(logMessage);
          }
        }, logObj).then(() => {
          this.pending_logs_to_send_to_browserbase = this.pending_logs_to_send_to_browserbase.filter(
            (log) => log.id !== logObj.id
          );
        }).catch(() => {
        });
      }
    });
  }
  /** @deprecated Use stagehand.page.act() instead. This will be removed in the next major release. */
  act(options) {
    return __async(this, null, function* () {
      return yield this.stagehandPage.act(options);
    });
  }
  /** @deprecated Use stagehand.page.extract() instead. This will be removed in the next major release. */
  extract(options) {
    return __async(this, null, function* () {
      return yield this.stagehandPage.extract(options);
    });
  }
  /** @deprecated Use stagehand.page.observe() instead. This will be removed in the next major release. */
  observe(options) {
    return __async(this, null, function* () {
      return yield this.stagehandPage.observe(options);
    });
  }
  close() {
    return __async(this, null, function* () {
      if (this.apiClient) {
        const response = yield this.apiClient.end();
        const body = yield response.json();
        if (!body.success) {
          if (response.status == 409) {
            this.log({
              category: "close",
              message: "Warning: attempted to end a session that is not currently active",
              level: 0
            });
          } else {
            throw new Error(body.message);
          }
        }
        return;
      } else {
        yield this.context.close();
      }
      if (this.contextPath) {
        try {
          import_fs.default.rmSync(this.contextPath, { recursive: true, force: true });
        } catch (e) {
          console.error("Error deleting context directory:", e);
        }
      }
    });
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AnnotatedScreenshotText,
  AvailableModelSchema,
  LLMClient,
  PlaywrightCommandException,
  PlaywrightCommandMethodNotSupportedException,
  Stagehand,
  defaultExtractSchema,
  pageTextSchema
});
