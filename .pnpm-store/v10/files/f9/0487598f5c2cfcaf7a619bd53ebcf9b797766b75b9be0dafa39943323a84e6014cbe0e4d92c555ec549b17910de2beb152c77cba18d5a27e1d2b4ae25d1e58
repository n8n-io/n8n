import type { VueCodeInformation } from '../types';
declare const raw: {
    all: {
        verification: true;
        completion: true;
        semantic: true;
        navigation: true;
    };
    none: {};
    verification: {
        verification: true;
    };
    completion: {
        completion: true;
    };
    additionalCompletion: {
        completion: {
            isAdditional: true;
        };
    };
    withoutCompletion: {
        verification: true;
        semantic: true;
        navigation: true;
    };
    navigation: {
        navigation: true;
    };
    navigationWithoutRename: {
        navigation: {
            shouldRename: () => false;
        };
    };
    navigationAndCompletion: {
        navigation: true;
        completion: true;
    };
    navigationAndAdditionalCompletion: {
        navigation: true;
        completion: {
            isAdditional: true;
        };
    };
    navigationAndVerification: {
        navigation: true;
        verification: true;
    };
    withoutNavigation: {
        verification: true;
        completion: true;
        semantic: true;
    };
    withoutHighlight: {
        semantic: {
            shouldHighlight: () => false;
        };
        verification: true;
        navigation: true;
        completion: true;
    };
    withoutHighlightAndNavigation: {
        semantic: {
            shouldHighlight: () => false;
        };
        verification: true;
        completion: true;
    };
    withoutHighlightAndCompletion: {
        semantic: {
            shouldHighlight: () => false;
        };
        verification: true;
        navigation: true;
    };
    withoutHighlightAndCompletionAndNavigation: {
        semantic: {
            shouldHighlight: () => false;
        };
        verification: true;
    };
};
export declare const codeFeatures: { [K in keyof typeof raw]: VueCodeInformation; };
export {};
