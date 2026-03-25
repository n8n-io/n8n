export function withChroma(userNextConfig: any = {}): any {
  const originalWebpackFunction = userNextConfig.webpack;

  const newWebpackFunction = (config: any, options: any): any => {
    if (!Array.isArray(config.externals)) {
      config.externals = [];
    }

    const externalsToAdd = ["@huggingface/transformers", "chromadb"];
    for (const ext of externalsToAdd) {
      if (!config.externals.includes(ext)) {
        config.externals.push(ext);
      }
    }

    if (typeof originalWebpackFunction === "function") {
      return originalWebpackFunction(config, options);
    }
    return config;
  };

  return {
    ...userNextConfig,
    webpack: newWebpackFunction,
  };
}
