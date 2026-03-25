import type { Oas3Decorator, Oas2Decorator } from '../../visitors';

export const InfoOverride: Oas3Decorator | Oas2Decorator = (newInfo) => {
  return {
    Info: {
      leave(info) {
        if (typeof newInfo !== 'object' || Array.isArray(newInfo) || newInfo === null) {
          throw new Error(`"info-override" decorator should be called with an object`);
        }
        const { severity: _, ...rest } = newInfo;
        Object.assign(info, rest);
      },
    },
  };
};
