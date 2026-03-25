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
export const reasonsSettings = {
    type: 'object',
    properties: reasonsBaseProperties,
    additionalProperties: false,
};
export const optionalEmailSettings = {
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
export const feedbackConfigSchema = {
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
                    properties: Object.assign(Object.assign({}, reasonsBaseProperties), { like: reasonsSettings, dislike: reasonsSettings, satisfied: reasonsSettings, neutral: reasonsSettings, dissatisfied: reasonsSettings }),
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
                optionalEmail: optionalEmailSettings,
            },
            additionalProperties: false,
        },
    },
    additionalProperties: false,
};
//# sourceMappingURL=feedback-config-schema.js.map