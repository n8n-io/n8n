import { StagehandContainer } from "./StagehandContainer";
import { GlobalPageContainer } from "./GlobalPageContainer";
import { ElementContainer } from "./ElementContainer";

/**
 * Decide which container to create.
 */
export function createStagehandContainer(
  obj: Window | HTMLElement,
): StagehandContainer {
  if (obj instanceof Window) {
    return new GlobalPageContainer();
  } else {
    return new ElementContainer(obj);
  }
}
