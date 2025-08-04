export interface PythonExecutionOptions {
	code: string;
	context: Record<string, any>;
	timeout?: number;
	venvPath?: string;
	packages?: string[];
}

export interface PythonExecutionResult {
	result: any;
	stdout: string;
	stderr: string;
	executionTime: number;
}

export interface IPythonExecutorService {
	executeCode(options: PythonExecutionOptions): Promise<PythonExecutionResult>;
	checkPythonAvailability(): Promise<{ available: boolean; version?: string; error?: string }>;
}
