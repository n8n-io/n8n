import fs from "fs";
const observationsPath = "./.cache/observations.json";
const actionsPath = "./.cache/actions.json";

/**
 * A file system cache to skip inference when repeating steps
 * It also acts as the source of truth for identifying previously seen actions and observations
 */
class Cache {
  disabled: boolean;

  constructor({ disabled = false } = {}) {
    this.disabled = disabled;
    if (!this.disabled) {
      this.initCache();
    }
  }

  readObservations() {
    if (this.disabled) {
      return {};
    }
    try {
      return JSON.parse(fs.readFileSync(observationsPath, "utf8"));
    } catch (error) {
      console.error("Error reading from observations.json", error);
      return {};
    }
  }

  readActions() {
    if (this.disabled) {
      return {};
    }
    try {
      return JSON.parse(fs.readFileSync(actionsPath, "utf8"));
    } catch (error) {
      console.error("Error reading from actions.json", error);
      return {};
    }
  }

  writeObservations({
    key,
    value,
  }: {
    key: string;
    value: { id: string; result: string };
  }) {
    if (this.disabled) {
      return;
    }

    const observations = this.readObservations();
    observations[key] = value;
    fs.writeFileSync(observationsPath, JSON.stringify(observations, null, 2));
  }

  writeActions({
    key,
    value,
  }: {
    key: string;
    value: { id: string; result: string };
  }) {
    if (this.disabled) {
      return;
    }

    const actions = this.readActions();
    actions[key] = value;
    fs.writeFileSync(actionsPath, JSON.stringify(actions, null, 2));
  }

  evictCache() {
    throw new Error("implement me");
  }

  private initCache() {
    if (this.disabled) {
      return;
    }
    const cacheDir = ".cache";

    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }
    if (!fs.existsSync(actionsPath)) {
      fs.writeFileSync(actionsPath, JSON.stringify({}));
    }

    if (!fs.existsSync(observationsPath)) {
      fs.writeFileSync(observationsPath, JSON.stringify({}));
    }
  }
}

export default Cache;
