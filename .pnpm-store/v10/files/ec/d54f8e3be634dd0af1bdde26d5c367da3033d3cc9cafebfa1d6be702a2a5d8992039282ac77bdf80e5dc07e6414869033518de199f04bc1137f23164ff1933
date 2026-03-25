import { Tool, ToolParams } from "@langchain/core/tools";
import { PyodideInterface, loadPyodide } from "pyodide";

//#region src/experimental/tools/pyinterpreter.d.ts
type PythonInterpreterToolParams = Parameters<typeof loadPyodide>[0] & ToolParams & {
  instance: PyodideInterface;
};
declare class PythonInterpreterTool extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  pyodideInstance: PyodideInterface;
  stdout: string;
  stderr: string;
  constructor(options: PythonInterpreterToolParams);
  addPackage(packageName: string): Promise<void>;
  get availableDefaultPackages(): string;
  static initialize(options: Omit<PythonInterpreterToolParams, "instance">): Promise<PythonInterpreterTool>;
  _call(script: string): Promise<string>;
}
//#endregion
export { PythonInterpreterTool, PythonInterpreterToolParams };
//# sourceMappingURL=pyinterpreter.d.cts.map