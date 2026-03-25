import type { ModelData } from "./model-data.js";
import type { PipelineType } from "./pipelines.js";
export interface LocalAppSnippet {
    /**
     * Title of the snippet
     */
    title: string;
    /**
     * Optional setup guide
     */
    setup?: string;
    /**
     * Content (or command) to be run
     */
    content: string | string[];
}
/**
 * Elements configurable by a local app.
 */
export type LocalApp = {
    /**
     * Name that appears in buttons
     */
    prettyLabel: string;
    /**
     * Link to get more info about a local app (website etc)
     */
    docsUrl: string;
    /**
     * main category of app
     */
    mainTask: PipelineType;
    /**
     * Whether to display a pill "macOS-only"
     */
    macOSOnly?: boolean;
    comingSoon?: boolean;
    /**
     * IMPORTANT: function to figure out whether to display the button on a model page's main "Use this model" dropdown.
     */
    displayOnModelPage: (model: ModelData) => boolean;
} & ({
    /**
     * If the app supports deeplink, URL to open.
     */
    deeplink: (model: ModelData, filepath?: string) => URL;
} | {
    /**
     * And if not (mostly llama.cpp), snippet to copy/paste in your terminal
     * Support the placeholder {{GGUF_FILE}} that will be replaced by the gguf file path or the list of available files.
     * Support the placeholder {{QUANT_TAG}} that will be replaced by the list of available quant tags or will be removed if there are no multiple quant files in a same repo.
     */
    snippet: (model: ModelData, filepath?: string) => string | string[] | LocalAppSnippet | LocalAppSnippet[];
});
declare function isTgiModel(model: ModelData): boolean;
declare function isLlamaCppGgufModel(model: ModelData): boolean;
/**
 * Add your new local app here.
 *
 * This is open to new suggestions and awesome upcoming apps.
 *
 * /!\ IMPORTANT
 *
 * If possible, you need to support deeplinks and be as cross-platform as possible.
 *
 * Ping the HF team if we can help with anything!
 */
export declare const LOCAL_APPS: {
    "llama.cpp": {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isLlamaCppGgufModel;
        snippet: (model: ModelData, filepath?: string) => LocalAppSnippet[];
    };
    "node-llama-cpp": {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isLlamaCppGgufModel;
        snippet: (model: ModelData, filepath?: string) => LocalAppSnippet[];
    };
    vllm: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: (model: ModelData) => boolean;
        snippet: (model: ModelData) => LocalAppSnippet[];
    };
    "mlx-lm": {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: (model: ModelData) => boolean;
        snippet: (model: ModelData) => LocalAppSnippet[];
    };
    tgi: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isTgiModel;
        snippet: (model: ModelData) => LocalAppSnippet[];
    };
    lmstudio: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: (model: ModelData) => boolean;
        deeplink: (model: ModelData, filepath: string | undefined) => URL;
    };
    localai: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isLlamaCppGgufModel;
        snippet: (model: ModelData, filepath?: string) => LocalAppSnippet[];
    };
    jan: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isLlamaCppGgufModel;
        deeplink: (model: ModelData) => URL;
    };
    backyard: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isLlamaCppGgufModel;
        deeplink: (model: ModelData) => URL;
    };
    sanctum: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isLlamaCppGgufModel;
        deeplink: (model: ModelData) => URL;
    };
    jellybox: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: (model: ModelData) => boolean;
        deeplink: (model: ModelData) => URL;
    };
    msty: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isLlamaCppGgufModel;
        deeplink: (model: ModelData) => URL;
    };
    recursechat: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        macOSOnly: true;
        displayOnModelPage: typeof isLlamaCppGgufModel;
        deeplink: (model: ModelData) => URL;
    };
    drawthings: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-to-image";
        macOSOnly: true;
        displayOnModelPage: (model: ModelData) => boolean;
        deeplink: (model: ModelData) => URL;
    };
    diffusionbee: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-to-image";
        macOSOnly: true;
        displayOnModelPage: (model: ModelData) => boolean;
        deeplink: (model: ModelData) => URL;
    };
    joyfusion: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-to-image";
        macOSOnly: true;
        displayOnModelPage: (model: ModelData) => boolean;
        deeplink: (model: ModelData) => URL;
    };
    invoke: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-to-image";
        displayOnModelPage: (model: ModelData) => boolean;
        deeplink: (model: ModelData) => URL;
    };
    ollama: {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isLlamaCppGgufModel;
        snippet: (model: ModelData, filepath?: string) => string;
    };
    "docker-model-runner": {
        prettyLabel: string;
        docsUrl: string;
        mainTask: "text-generation";
        displayOnModelPage: typeof isLlamaCppGgufModel;
        snippet: (model: ModelData, filepath?: string) => string;
    };
};
export type LocalAppKey = keyof typeof LOCAL_APPS;
export {};
//# sourceMappingURL=local-apps.d.ts.map