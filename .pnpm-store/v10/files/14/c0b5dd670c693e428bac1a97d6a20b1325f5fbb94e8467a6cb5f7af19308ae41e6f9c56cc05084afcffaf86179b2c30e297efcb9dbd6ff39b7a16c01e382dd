export type LogLine = {
    id?: string;
    category?: string;
    message: string;
    level?: 0 | 1 | 2;
    timestamp?: string;
    auxiliary?: {
        [key: string]: {
            value: string;
            type: "object" | "string" | "html" | "integer" | "float" | "boolean";
        };
    };
};
