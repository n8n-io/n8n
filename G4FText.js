"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.G4fNode = void 0;
var n8n_workflow_1 = require("n8n-workflow");
// Исправленный импорт библиотеки g4f
var G4F = require("g4f");
// Определение моделей и провайдеров в соответствии с документацией
// https://github.com/xtekky/gpt4free/blob/main/docs/providers-and-models.md
var providersData = {
    "Aichat": {
        "models": ["gpt-3.5-turbo", "gpt-3.5-turbo-16k", "gpt-4", "gpt-4-32k"]
    },
    "Bard": {
        "models": ["Palm 2"]
    },
    "Bing": {
        "models": ["gpt-4", "creative", "balanced", "precise"]
    },
    "ChatgptAi": {
        "models": ["gpt-3.5-turbo"]
    },
    "ChatgptLogin": {
        "models": ["text-davinci-002-render-sha", "gpt-4"]
    },
    "DeepAi": {
        "models": ["gpt-3.5-turbo"]
    },
    "GeminiPro": {
        "models": ["gemini-pro"]
    },
    "GptForLove": {
        "models": ["gpt-3.5-turbo"]
    },
    "GptGo": {
        "models": ["gpt-3.5-turbo"]
    },
    "H2o": {
        "models": ["falcon-40b", "falcon-7b", "llama-13b"]
    },
    "HuggingChat": {
        "models": ["mistral-7b-instruct", "meta-llama/llama-2-13b-chat", "codellama/codellama-34b-instruct", "meta-llama/llama-2-70b-chat", "openchat/openchat_3.5", "tiiuae/falcon-180b-chat", "mistralai/mixtral-8x7b-instruct", "google/gemma-7b-it"]
    },
    "MultiGPT": {
        "models": ["gpt-3.5-turbo"]
    },
    "OpenaiChat": {
        "models": ["gpt-3.5-turbo", "gpt-3.5-turbo-0125", "gpt-3.5-turbo-16k-0613", "gpt-4", "gpt-4-0125-preview", "gpt-4-turbo", "gpt-4-1106-preview", "gpt-4-vision-preview", "gpt-4o", "gpt-4o-mini"]
    },
    "PerplexityAi": {
        "models": ["llama-3-sonar-large-32k-online", "llama-3-sonar-small-32k-online", "sonar-small-chat", "sonar-medium-chat", "sonar-medium-online", "mistral-small", "mixtral-8x7b", "claude-3-haiku", "mistral-large", "claude-3-opus", "claude-3-sonnet"]
    },
    "Phind": {
        "models": ["Phind Model v2"]
    },
    "Poe": {
        "models": ["sage", "claude-instant", "beaver", "chinchilla", "a2_100k", "a2_2", "a2", "capybara", "gpt-4-32k", "gpt-4-32k-v", "gpt-4-mobile", "gpt-4-v", "gpt-4", "claude-instant-100k", "Claude-2-100k", "apl", "llama-2-7b", "llama-2-13b", "llama-2-70b"]
    },
    "You": {
        "models": ["you1", "you2", "youchat"]
    },
    "Vitalentum": {
        "models": ["gpt-3.5-turbo"]
    },
    "Yqcloud": {
        "models": ["gpt-3.5-turbo"]
    },
    "FreeChatgpt": {
        "models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-vision-preview"]
    },
    "Liaobots": {
        "models": ["gpt-3.5-turbo", "gpt-4"]
    }
};
// Создаем отображение ID моделей для внутреннего использования
var modelIdMap = {};
Object.entries(providersData).forEach(function (_a) {
    var provider = _a[0], data = _a[1];
    data.models.forEach(function (model) {
        // Создаем ID модели, заменяя специальные символы на подчеркивания
        var modelId = model.toLowerCase().replace(/[^a-z0-9]/g, '_');
        modelIdMap[modelId] = model;
    });
});
var G4fNode = /** @class */ (function () {
    function G4fNode() {
        this.description = {
            displayName: 'G4F',
            name: 'g4f',
            icon: 'file:g4f.svg',
            group: ['transform'],
            version: 1,
            subtitle: '={{$parameter["operation"] + ": " + ($parameter["provider"] || "") + " - " + ($parameter["model"] || "")}}',
            description: 'Использование GPT4Free для получения ответов от различных моделей без API ключей',
            defaults: {
                name: 'G4F',
            },
            // Исправляем типы для inputs и outputs
            inputs: [
                {
                    type: "main" /* NodeConnectionType.Main */,
                },
            ],
            outputs: [
                {
                    type: "main" /* NodeConnectionType.Main */,
                },
            ],
            properties: [
                {
                    displayName: 'Операция',
                    name: 'operation',
                    type: 'options',
                    noDataExpression: true,
                    options: [
                        {
                            name: 'Completion',
                            value: 'completion',
                        },
                        {
                            name: 'Chat',
                            value: 'chat',
                        },
                    ],
                    default: 'completion',
                },
                {
                    displayName: 'Провайдер',
                    name: 'provider',
                    type: 'options',
                    options: Object.keys(providersData).map(function (provider) { return ({
                        name: provider,
                        value: provider,
                    }); }),
                    default: 'OpenaiChat',
                    required: true,
                    description: 'Провайдер для использования',
                },
                {
                    displayName: 'Модель',
                    name: 'model',
                    type: 'options',
                    typeOptions: {
                        loadOptionsMethod: 'getModels',
                    },
                    default: '',
                    required: true,
                    description: 'Модель для использования (зависит от выбранного провайдера)',
                },
                {
                    displayName: 'Промпт',
                    name: 'prompt',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    required: true,
                    displayOptions: {
                        show: {
                            operation: ['completion'],
                        },
                    },
                    description: 'Текст запроса для completion',
                },
                {
                    displayName: 'Системный промпт',
                    name: 'systemPrompt',
                    type: 'string',
                    typeOptions: {
                        rows: 4,
                    },
                    default: '',
                    displayOptions: {
                        show: {
                            operation: ['chat'],
                        },
                    },
                    description: 'Системный промпт для установки контекста или инструкций для AI',
                },
                {
                    displayName: 'Сообщения',
                    name: 'messages',
                    type: 'fixedCollection',
                    typeOptions: {
                        multipleValues: true,
                        sortable: true,
                    },
                    displayOptions: {
                        show: {
                            operation: ['chat'],
                        },
                    },
                    default: {},
                    placeholder: 'Добавить сообщение',
                    options: [
                        {
                            name: 'messageValues',
                            displayName: 'Сообщение',
                            values: [
                                {
                                    displayName: 'Роль',
                                    name: 'role',
                                    type: 'options',
                                    options: [
                                        {
                                            name: 'User',
                                            value: 'user',
                                        },
                                        {
                                            name: 'Assistant',
                                            value: 'assistant',
                                        },
                                    ],
                                    default: 'user',
                                    description: 'Роль для этого сообщения',
                                },
                                {
                                    displayName: 'Содержание',
                                    name: 'content',
                                    type: 'string',
                                    typeOptions: {
                                        rows: 3,
                                    },
                                    default: '',
                                    description: 'Содержание сообщения',
                                },
                            ],
                        },
                    ],
                    description: 'Сообщения для отправки в чат API',
                },
                {
                    displayName: 'Дополнительные параметры',
                    name: 'additionalOptions',
                    type: 'collection',
                    placeholder: 'Добавить опцию',
                    default: {},
                    options: [
                        {
                            displayName: 'Максимальная длина ответа',
                            name: 'maxTokens',
                            type: 'number',
                            default: 1024,
                            description: 'Максимальное количество токенов для генерации',
                        },
                        {
                            displayName: 'Температура',
                            name: 'temperature',
                            type: 'number',
                            typeOptions: {
                                minValue: 0,
                                maxValue: 2,
                                numberPrecision: 1,
                            },
                            default: 0.7,
                            description: 'Контролирует случайность ответов (0-2)',
                        },
                        {
                            displayName: 'Top P',
                            name: 'topP',
                            type: 'number',
                            typeOptions: {
                                minValue: 0,
                                maxValue: 1,
                                numberPrecision: 2,
                            },
                            default: 1,
                            description: 'Контролирует разнообразие через nucleus sampling',
                        },
                        {
                            displayName: 'Presence Penalty',
                            name: 'presencePenalty',
                            type: 'number',
                            typeOptions: {
                                minValue: -2,
                                maxValue: 2,
                                numberPrecision: 1,
                            },
                            default: 0,
                            description: 'Уменьшает вероятность повторения тем',
                        },
                        {
                            displayName: 'Frequency Penalty',
                            name: 'frequencyPenalty',
                            type: 'number',
                            typeOptions: {
                                minValue: -2,
                                maxValue: 2,
                                numberPrecision: 1,
                            },
                            default: 0,
                            description: 'Уменьшает вероятность повторения слов',
                        },
                        {
                            displayName: 'Количество вариантов ответа',
                            name: 'n',
                            type: 'number',
                            default: 1,
                            description: 'Количество возвращаемых вариантов ответа',
                        },
                        {
                            displayName: 'Потоковый режим',
                            name: 'stream',
                            type: 'boolean',
                            default: false,
                            description: 'Использовать потоковую передачу ответа (для некоторых провайдеров)',
                        },
                        {
                            displayName: 'Прокси',
                            name: 'proxy',
                            type: 'string',
                            default: '',
                            placeholder: 'http://username:password@host:port',
                            description: 'Прокси для запросов (не обязательно)',
                        },
                        {
                            displayName: 'Время ожидания (сек)',
                            name: 'timeout',
                            type: 'number',
                            default: 120,
                            description: 'Максимальное время ожидания ответа в секундах',
                        },
                    ],
                },
            ],
        };
        this.methods = {
            loadOptions: {
                getModels: function () {
                    return __awaiter(this, void 0, void 0, function () {
                        var provider, modelOptions, _i, _a, modelName, modelId;
                        return __generator(this, function (_b) {
                            provider = this.getNodeParameter('provider');
                            modelOptions = [];
                            if (provider && providersData[provider]) {
                                for (_i = 0, _a = providersData[provider].models; _i < _a.length; _i++) {
                                    modelName = _a[_i];
                                    modelId = modelName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                                    modelOptions.push({
                                        name: modelName,
                                        value: modelId,
                                    });
                                }
                            }
                            return [2 /*return*/, modelOptions];
                        });
                    });
                },
            },
        };
    }
    G4fNode.prototype.execute = function () {
        return __awaiter(this, void 0, void 0, function () {
            var items, returnData, i, operation, provider, modelId, additionalOptions, modelName, Provider, response, requestParams, prompt_1, error_1, systemPrompt, messagesCollection, messages, error_2, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        items = this.getInputData();
                        returnData = [];
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < items.length)) return [3 /*break*/, 14];
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 12, , 13]);
                        operation = this.getNodeParameter('operation', i);
                        provider = this.getNodeParameter('provider', i);
                        modelId = this.getNodeParameter('model', i);
                        additionalOptions = this.getNodeParameter('additionalOptions', i, {});
                        modelName = modelIdMap[modelId];
                        Provider = G4F.Provider[provider];
                        // Проверка наличия провайдера
                        if (!Provider) {
                            throw new Error("\u041F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440 ".concat(provider, " \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0431\u0438\u0431\u043B\u0438\u043E\u0442\u0435\u043A\u0435 G4F"));
                        }
                        response = void 0;
                        requestParams = {
                            model: modelName,
                            provider: Provider,
                            max_tokens: additionalOptions.maxTokens || 1024,
                            temperature: additionalOptions.temperature || 0.7,
                            top_p: additionalOptions.topP || 1,
                            presence_penalty: additionalOptions.presencePenalty || 0,
                            frequency_penalty: additionalOptions.frequencyPenalty || 0,
                            n: additionalOptions.n || 1,
                            stream: additionalOptions.stream || false,
                        };
                        // Добавляем прокси, если указан
                        if (additionalOptions.proxy) {
                            requestParams.proxy = additionalOptions.proxy;
                        }
                        // Добавляем таймаут, если указан
                        if (additionalOptions.timeout) {
                            requestParams.timeout = additionalOptions.timeout;
                        }
                        if (!(operation === 'completion')) return [3 /*break*/, 7];
                        prompt_1 = this.getNodeParameter('prompt', i);
                        requestParams.prompt = prompt_1;
                        _a.label = 3;
                    case 3:
                        _a.trys.push([3, 5, , 6]);
                        return [4 /*yield*/, G4F.Completion.create(requestParams)];
                    case 4:
                        // Вызываем Completion API из G4F
                        response = _a.sent();
                        return [3 /*break*/, 6];
                    case 5:
                        error_1 = _a.sent();
                        throw new Error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0438 completion: ".concat(error_1.message));
                    case 6: return [3 /*break*/, 11];
                    case 7:
                        if (!(operation === 'chat')) return [3 /*break*/, 11];
                        systemPrompt = this.getNodeParameter('systemPrompt', i, '');
                        messagesCollection = this.getNodeParameter('messages.messageValues', i, []);
                        messages = [];
                        // Добавляем системный промпт, если он указан
                        if (systemPrompt) {
                            messages.push({
                                role: 'system',
                                content: systemPrompt
                            });
                        }
                        // Добавляем остальные сообщения
                        messages.push.apply(messages, messagesCollection);
                        // Проверка на наличие хотя бы одного сообщения
                        if (messages.length === 0) {
                            throw new Error('Для чата необходимо добавить хотя бы одно сообщение');
                        }
                        requestParams.messages = messages;
                        _a.label = 8;
                    case 8:
                        _a.trys.push([8, 10, , 11]);
                        return [4 /*yield*/, G4F.ChatCompletion.create(requestParams)];
                    case 9:
                        // Вызываем ChatCompletion API из G4F
                        response = _a.sent();
                        return [3 /*break*/, 11];
                    case 10:
                        error_2 = _a.sent();
                        throw new Error("\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u0438 chat completion: ".concat(error_2.message));
                    case 11:
                        returnData.push({
                            json: {
                                response: response,
                                provider: provider,
                                model: modelName,
                                operation: operation,
                                request: __assign(__assign({}, requestParams), { 
                                    // Удаляем большие поля для удобства вывода
                                    prompt: requestParams.prompt ? '(содержимое промпта)' : undefined, messages: requestParams.messages ? "(".concat(requestParams.messages.length, " \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439)") : undefined, 
                                    // Удаляем ссылку на провайдер, так как это объект
                                    provider: provider }),
                            },
                        });
                        return [3 /*break*/, 13];
                    case 12:
                        error_3 = _a.sent();
                        if (this.continueOnFail()) {
                            returnData.push({
                                json: {
                                    error: error_3.message,
                                },
                            });
                            return [3 /*break*/, 13];
                        }
                        throw new n8n_workflow_1.NodeOperationError(this.getNode(), error_3, {
                            itemIndex: i,
                        });
                    case 13:
                        i++;
                        return [3 /*break*/, 1];
                    case 14: return [2 /*return*/, [returnData]];
                }
            });
        });
    };
    return G4fNode;
}());
exports.G4fNode = G4fNode;
