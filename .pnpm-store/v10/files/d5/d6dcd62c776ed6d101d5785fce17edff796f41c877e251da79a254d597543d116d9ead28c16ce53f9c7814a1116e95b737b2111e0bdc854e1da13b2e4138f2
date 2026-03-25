"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_agent_1 = require("../user-agent");
const EnvironmentModule = __importStar(require("../environment"));
describe('user-agent', () => {
    describe('buildUserAgent', () => {
        test('applies Edge Runtime when running in an edge environment', () => {
            jest.spyOn(EnvironmentModule, 'isEdge').mockReturnValue(true);
            const config = { apiKey: 'test-api-key' };
            const userAgent = (0, user_agent_1.buildUserAgent)(config);
            expect(userAgent).toContain('Edge Runtime');
        });
        test('applies source_tag when provided via PineconeConfiguration', () => {
            const config = {
                apiKey: 'test-api-key',
                sourceTag: 'test source tag',
            };
            const userAgent = (0, user_agent_1.buildUserAgent)(config);
            expect(userAgent).toContain('source_tag=test_source_tag');
        });
    });
    describe('normalizeSourceTag', () => {
        test('normalizes variations of sourceTag', () => {
            const config = {
                apiKey: 'test-api-key',
                sourceTag: 'my source tag!!!',
            };
            let userAgent = (0, user_agent_1.buildUserAgent)(config);
            expect(userAgent).toContain('source_tag=my_source_tag');
            config.sourceTag = 'My Source Tag';
            userAgent = (0, user_agent_1.buildUserAgent)(config);
            expect(userAgent).toContain('source_tag=my_source_tag');
            config.sourceTag = '   My   Source    Tag       123    ';
            userAgent = (0, user_agent_1.buildUserAgent)(config);
            expect(userAgent).toContain('source_tag=my_source_tag_123');
            config.sourceTag = '  MY SOURCE TAG     1234     ##### !!!!!!';
            userAgent = (0, user_agent_1.buildUserAgent)(config);
            expect(userAgent).toContain('source_tag=my_source_tag_1234');
            config.sourceTag = ' MY SOURCE TAG :1234-ABCD';
            userAgent = (0, user_agent_1.buildUserAgent)(config);
            expect(userAgent).toContain('source_tag=my_source_tag_:1234abcd');
        });
    });
});
//# sourceMappingURL=user-agent.test.js.map