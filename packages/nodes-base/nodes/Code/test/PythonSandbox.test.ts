import * as fs from 'fs';
import type { IExecuteFunctions } from 'n8n-workflow';
import * as path from 'path';
import { Worker } from 'worker_threads';

import { PythonSandbox } from '../PythonSandbox';

jest.mock('fs');
jest.mock('worker_threads');

describe('PythonSandbox', () => {
  let sandbox: PythonSandbox;
  let mockHelpers: IExecuteFunctions['helpers'];
  let mockWorker: { on: jest.Mock; postMessage: jest.Mock };

  const mockStoragePath = '/mock/storage/path';
  const mockPythonCode = 'print("Hello World")';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock helpers
    mockHelpers = {
      getStoragePath: jest.fn().mockReturnValue(mockStoragePath),
    } as unknown as IExecuteFunctions['helpers'];

    // Mock fs functions
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockImplementation(() => undefined);
    (fs.writeFileSync as jest.Mock).mockImplementation(() => undefined);
    (fs.unlinkSync as jest.Mock).mockImplementation(() => undefined);

    // Mock Worker
    mockWorker = {
      on: jest.fn(),
      postMessage: jest.fn(),
    };

    (Worker as unknown as jest.Mock).mockImplementation(() => mockWorker);

    // Setup default worker behavior
    mockWorker.on.mockImplementation((event, callback) => {
      if (event === 'message') {
        callback({ success: true, result: {} });
      }
      return mockWorker;
    });

    // Create sandbox instance
    sandbox = new PythonSandbox({} as any, mockPythonCode, mockHelpers);
  });

  describe('worker file management', () => {
    it('should create worker file in the correct directory', async () => {
      // Mock Date.now() to get consistent file names
      const mockTimestamp = 1234567890;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      // Access the private method
      const createWorkerFile = (sandbox as any).createWorkerFile.bind(sandbox);
      const workerFilePath = await createWorkerFile();

      // Assertions
      const expectedPath = path.join(mockStoragePath, 'workers', `python-worker-${mockTimestamp}.js`);
      expect(workerFilePath).toBe(expectedPath);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expectedPath, expect.any(String));
    });

    it('should create the workers directory if it does not exist', async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      // Execute
      const createWorkerFile = (sandbox as any).createWorkerFile.bind(sandbox);
      await createWorkerFile();

      // Assert
      expect(fs.mkdirSync).toHaveBeenCalledWith(
        path.join(mockStoragePath, 'workers'),
        { recursive: true }
      );
    });

    it('should generate worker code with correct absolute paths', async () => {
      // Execute
      const generateWorkerCode = (sandbox as any).generateWorkerCode.bind(sandbox);
      const workerCode = generateWorkerCode();

      // Assert
      const pyodidePath = path.resolve(__dirname, '../Pyodide.js');
      expect(workerCode).toContain(`require('${pyodidePath}')`);
    });

    it('should clean up worker file after execution', async () => {
      // Setup
      jest.spyOn(sandbox as any, 'executePythonInWorker').mockResolvedValue({});

      // Execute
      const runCodeInPython = (sandbox as any).runCodeInPython.bind(sandbox);
      await runCodeInPython();

      // Assert
      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });

  describe('worker communication', () => {
    it('should pass the correct packageCacheDir to the worker', async () => {
      // Setup a spy to capture worker options
      let capturedOptions: any;
      (Worker as unknown as jest.Mock).mockImplementation((_, options) => {
        capturedOptions = options;
        return mockWorker;
      });

      // Execute
      const executePythonInWorker = (sandbox as any).executePythonInWorker.bind(sandbox);
      await executePythonInWorker('/mock/worker/file.js');

      // Assert
      expect(capturedOptions.workerData.packageCacheDir).toBe(mockStoragePath);
    });

    it('should handle worker exit with non-zero code as error', async () => {
      // Setup worker to emit exit event with error code
      mockWorker.on.mockImplementation((event, callback) => {
        if (event === 'exit') {
          callback(1); // Non-zero exit code
        }
        return mockWorker;
      });

      // Execute and assert
      const executePythonInWorker = (sandbox as any).executePythonInWorker.bind(sandbox);
      await expect(executePythonInWorker('/mock/worker/file.js')).rejects.toThrow('Worker stopped with exit code 1');
    });
  });

  describe('Python code execution', () => {
    it('should execute code and return the result', async () => {
      // Setup worker to return a specific result
      mockWorker.on.mockImplementation((event, callback) => {
        if (event === 'message') {
          callback({ success: true, result: { hello: 'world' } });
        }
        return mockWorker;
      });

      // Create sandbox with specific Python code
      const pythonCode = 'result = {"hello": "world"}\nreturn result';
      const testSandbox = new PythonSandbox({} as any, pythonCode, mockHelpers);

      // Execute and assert
      const result = await testSandbox.runCode();
      expect(result).toEqual({ hello: 'world' });

      // Verify worker was created with correct code
      expect(Worker).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          workerData: expect.objectContaining({ pythonCode })
        })
      );
    });

    it('should propagate Python execution errors', async () => {
      // Setup worker to return an error
      mockWorker.on.mockImplementation((event, callback) => {
        if (event === 'message') {
          callback({
            success: false,
            error: 'NameError: name "undefined_variable" is not defined',
            type: 'NameError'
          });
        }
        return mockWorker;
      });

      // Execute and assert
      await expect(sandbox.runCode()).rejects.toThrow();
    });

    it('should format Python errors for better readability', async () => {
      // Setup
      const error = new Error('Python Error: NameError: name is not defined');
      (error as any).type = 'NameError';

      // Execute
      const getPrettyError = (sandbox as any).getPrettyError.bind(sandbox);
      const prettyError = getPrettyError(error);

      // Assert
      expect(prettyError.message).toContain('NameError');
    });
  });

  describe('context handling', () => {
    it('should convert $ prefixed variables to _ prefixed for Python compatibility', () => {
      // Setup context with $ prefixed variables
      const context = {
        $input: { item: { json: {} } },
        $json: { data: 123 }
      };

      // Create sandbox with this context
      const testSandbox = new PythonSandbox(context as any, mockPythonCode, mockHelpers);

      // Access the private context property
      const pythonContext = (testSandbox as any).context;

      // Assert
      expect(pythonContext).toHaveProperty('_input');
      expect(pythonContext).toHaveProperty('_json');
      expect(pythonContext).not.toHaveProperty('$input');
      expect(pythonContext).not.toHaveProperty('$json');
    });

    it('should pass sanitized context to the worker', async () => {
      // Setup
      let capturedWorkerData: any;
      (Worker as unknown as jest.Mock).mockImplementation((_, options) => {
        capturedWorkerData = options.workerData;
        return mockWorker;
      });

      // Create context with test data
      const testContext = {
        $input: { item: { json: { testData: 123 } } },
        $json: { testData: 123 }
      };

      // Create sandbox with this context
      const testSandbox = new PythonSandbox(testContext as any, mockPythonCode, mockHelpers);

      // Execute
      await testSandbox.runCode();

      // Assert
      expect(capturedWorkerData.context).toHaveProperty('_json');
      expect(capturedWorkerData.context._json).toHaveProperty('testData', 123);
    });

    it('should handle circular references in context', async () => {
      // Setup
      let capturedWorkerData: any;
      (Worker as unknown as jest.Mock).mockImplementation((_, options) => {
        capturedWorkerData = options.workerData;
        return mockWorker;
      });

      // Create circular reference
      const circularObj: any = { name: 'circular' };
      circularObj.self = circularObj;

      const testContext = {
        $input: { item: { json: { circular: circularObj } } }
      };

      // Create sandbox and execute
      const testSandbox = new PythonSandbox(testContext as any, mockPythonCode, mockHelpers);
      await testSandbox.runCode();

      // Assert
      expect(capturedWorkerData.context._input.item.json.circular).toBeDefined();
      expect(capturedWorkerData.context._input.item.json.circular.name).toBe('circular');
      expect(capturedWorkerData.context._input.item.json.circular.self).toBeDefined();
    });

    it('should filter out non-serializable values from context', async () => {
      // Setup
      let capturedWorkerData: any;
      (Worker as unknown as jest.Mock).mockImplementation((_, options) => {
        capturedWorkerData = options.workerData;
        return mockWorker;
      });

      // Create context with function and symbol
      const testContext = {
        $input: {
          item: {
            json: {
              fn: () => console.log('test'),
              sym: Symbol('test'),
              valid: 'data'
            }
          }
        }
      };

      // Create sandbox and execute
      const testSandbox = new PythonSandbox(testContext as any, mockPythonCode, mockHelpers);
      await testSandbox.runCode();

      // Assert
      expect(capturedWorkerData.context._input.item.json.valid).toBe('data');
      expect(capturedWorkerData.context._input.item.json.fn).toBeUndefined();
      expect(capturedWorkerData.context._input.item.json.sym).toBeUndefined();
    });
  });

});