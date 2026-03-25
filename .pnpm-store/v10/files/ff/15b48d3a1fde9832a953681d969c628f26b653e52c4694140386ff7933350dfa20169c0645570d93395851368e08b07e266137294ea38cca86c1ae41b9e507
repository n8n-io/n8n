"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryDependencies = void 0;
const domains_1 = require("../../redocly/domains");
const RegistryDependencies = () => {
    const registryDependencies = new Set();
    return {
        Root: {
            leave(_, ctx) {
                const data = ctx.getVisitorData();
                data.links = Array.from(registryDependencies);
            },
        },
        ref(node) {
            if (node.$ref) {
                const link = node.$ref.split('#/')[0];
                if ((0, domains_1.isRedoclyRegistryURL)(link)) {
                    registryDependencies.add(link);
                }
            }
        },
    };
};
exports.RegistryDependencies = RegistryDependencies;
