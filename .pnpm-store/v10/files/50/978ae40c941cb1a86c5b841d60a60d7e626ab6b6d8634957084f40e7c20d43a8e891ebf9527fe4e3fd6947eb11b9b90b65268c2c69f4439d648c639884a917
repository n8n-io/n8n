"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackConfigSchema = exports.optionalEmailSettings = exports.reasonsSettings = void 0;
const reasonsBaseProperties = {
    hide: {
        type: 'boolean',
        default: false,
    },
    component: {
        type: 'string',
        enum: ['radio', 'checkbox'],
        default: 'checkbox',
    },
    label: { type: 'string' },
    items: { type: 'array', items: { type: 'string' } },
};
exports.reasonsSettings = {
    type: 'object',
    properties: reasonsBaseProperties,
    additionalProperties: false,
};
exports.optionalEmailSettings = {
    type: 'object',
    properties: {
        hide: {
            type: 'boolean',
            default: false,
        },
        label: { type: 'string' },
        placeholder: { type: 'string' },
    },
    additionalProperties: false,
};
exports.feedbackConfigSchema = {
    type: 'object',
    properties: {
        hide: {
            type: 'boolean',
            default: false,
        },
        type: {
            type: 'string',
            enum: ['rating', 'sentiment', 'comment', 'reasons', 'mood', 'scale'],
            default: 'sentiment',
        },
        settings: {
            type: 'object',
            properties: {
                label: { type: 'string' },
                submitText: { type: 'string' },
                buttonText: { type: 'string' },
                component: {
                    type: 'string',
                    enum: ['radio', 'checkbox'],
                    default: 'checkbox',
                },
                items: { type: 'array', items: { type: 'string' }, minItems: 1 },
                leftScaleLabel: { type: 'string' },
                rightScaleLabel: { type: 'string' },
                reasons: {
                    type: 'object',
                    properties: Object.assign(Object.assign({}, reasonsBaseProperties), { like: exports.reasonsSettings, dislike: exports.reasonsSettings, satisfied: exports.reasonsSettings, neutral: exports.reasonsSettings, dissatisfied: exports.reasonsSettings }),
                    additionalProperties: false,
                },
                comment: {
                    type: 'object',
                    properties: {
                        hide: {
                            type: 'boolean',
                            default: false,
                        },
                        label: { type: 'string' },
                        likeLabel: { type: 'string' },
                        dislikeLabel: { type: 'string' },
                        satisfiedLabel: { type: 'string' },
                        neutralLabel: { type: 'string' },
                        dissatisfiedLabel: { type: 'string' },
                    },
                    additionalProperties: false,
                },
                optionalEmail: exports.optionalEmailSettings,
            },
            additionalProperties: false,
        },
    },
    additionalProperties: false,
};
//# sourceMappingURL=feedback-config-schema.js.map