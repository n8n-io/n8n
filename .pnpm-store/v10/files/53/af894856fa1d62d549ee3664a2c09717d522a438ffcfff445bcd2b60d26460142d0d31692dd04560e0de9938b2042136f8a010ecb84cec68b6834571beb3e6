export declare const printVitestReporterTable: (files: any, ctx: any) => Promise<void>;
export interface VitestTestModule {
    children: {
        allTests: () => {
            name: string;
            result: () => {
                state: "pending" | "passed" | "failed" | "skipped";
            };
            diagnostic: () => {
                duration: number;
            };
        }[];
    };
    state: () => "skipped" | "passed" | "failed";
    relativeModuleId: string;
}
export declare const printVitestTestModulesReporterTable: (testModules: {
    children: {
        allTests: () => {
            name: string;
            result: () => {
                state: "pending" | "passed" | "failed" | "skipped";
            };
            diagnostic: () => {
                duration: number;
            };
        }[];
    };
    state: () => "skipped" | "passed" | "failed";
    relativeModuleId: string;
}[]) => Promise<void>;
