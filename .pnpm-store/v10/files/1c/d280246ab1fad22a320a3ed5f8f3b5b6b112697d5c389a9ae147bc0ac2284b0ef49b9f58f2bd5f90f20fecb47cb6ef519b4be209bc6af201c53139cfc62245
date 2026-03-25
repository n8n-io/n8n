"use strict";

class DefaultEvictor {
  evict(config, pooledResource, availableObjectsCount) {
    const idleTime = Date.now() - pooledResource.lastIdleTime;

    if (
      config.softIdleTimeoutMillis > 0 &&
      config.softIdleTimeoutMillis < idleTime &&
      config.min < availableObjectsCount
    ) {
      return true;
    }

    if (config.idleTimeoutMillis < idleTime) {
      return true;
    }

    return false;
  }
}

module.exports = DefaultEvictor;
