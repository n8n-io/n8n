export type CommandError = Error & {
    exitCode?: number;
};
export interface OclifError {
    oclif: {
        exit?: number | undefined;
    };
}
export interface PrettyPrintableError {
    /**
     * a unique error code for this error class
     */
    code?: string | undefined;
    /**
     * message to display related to the error
     */
    message?: string | undefined;
    /**
     * a url to find out more information related to this error
     * or fixing the error
     */
    ref?: string | undefined;
    /**
     * a suggestion that may be useful or provide additional context
     */
    suggestions?: string[] | undefined;
}
