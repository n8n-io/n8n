import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { Oas2PathItem } from '../../typings/swagger';
import type { Oas3PathItem } from '../../typings/openapi';
import type { UserContext } from '../../walk';

const defaultOrder = ['get', 'head', 'post', 'put', 'patch', 'delete', 'options', 'trace'];

export const PathHttpVerbsOrder: Oas3Rule | Oas2Rule = (opts: any) => {
  const order: string[] = (opts && opts.order) || defaultOrder;
  if (!Array.isArray(order)) {
    throw new Error('path-http-verbs-order `order` option must be an array');
  }

  return {
    PathItem(path: Oas2PathItem | Oas3PathItem, { report, location }: UserContext) {
      const httpVerbs = Object.keys(path).filter((k) => order.includes(k));

      for (let i = 0; i < httpVerbs.length - 1; i++) {
        const aIdx = order.indexOf(httpVerbs[i]);
        const bIdx = order.indexOf(httpVerbs[i + 1]);
        if (bIdx < aIdx) {
          report({
            message: 'Operation http verbs must be ordered.',
            location: { reportOnKey: true, ...location.child(httpVerbs[i + 1]) },
          });
        }
      }
    },
  };
};
