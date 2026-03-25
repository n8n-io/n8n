// These are typically used in conjunction with noevent to ensure that we can
// preventDefault on the event.
export const nonpassive = {passive: false};
export const nonpassivecapture = {capture: true, passive: false};

export function nopropagation(event) {
  event.stopImmediatePropagation();
}

export default function(event) {
  event.preventDefault();
  event.stopImmediatePropagation();
}
