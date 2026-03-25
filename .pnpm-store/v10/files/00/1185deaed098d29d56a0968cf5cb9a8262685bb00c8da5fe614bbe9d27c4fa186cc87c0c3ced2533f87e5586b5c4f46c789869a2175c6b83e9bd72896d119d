import type { Oas3Rule, Oas2Rule } from '../../visitors';
import type { UserContext } from '../../walk';
import type { Oas3Paths } from '../../typings/openapi';
import type { Oas2Paths } from '../../typings/swagger';

export const NoAmbiguousPaths: Oas3Rule | Oas2Rule = () => {
  return {
    Paths(pathMap: Oas3Paths | Oas2Paths, { report, location }: UserContext) {
      const seenPaths: string[] = [];

      for (const currentPath of Object.keys(pathMap)) {
        const ambiguousPath = seenPaths.find((seenPath) =>
          arePathsAmbiguous(seenPath, currentPath)
        );
        if (ambiguousPath) {
          report({
            message: `Paths should resolve unambiguously. Found two ambiguous paths: \`${ambiguousPath}\` and \`${currentPath}\`.`,
            location: location.child([currentPath]).key(),
          });
        }
        seenPaths.push(currentPath);
      }
    },
  };
};

function arePathsAmbiguous(a: string, b: string) {
  const partsA = a.split('/');
  const partsB = b.split('/');

  if (partsA.length !== partsB.length) return false;

  let aVars = 0;
  let bVars = 0;
  let ambiguous = true;
  for (let i = 0; i < partsA.length; i++) {
    const aIsVar = partsA[i].match(/^{.+?}$/);
    const bIsVar = partsB[i].match(/^{.+?}$/);

    if (aIsVar || bIsVar) {
      if (aIsVar) aVars++;
      if (bIsVar) bVars++;
      continue;
    } else if (partsA[i] !== partsB[i]) {
      ambiguous = false;
    }
  }

  return ambiguous && aVars === bVars;
}
