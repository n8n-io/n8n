// src/preview-api/modules/preview-web/render/animation-utils.ts
function isTestEnvironment() {
  try {
    return (
      // @ts-expect-error This property exists in Vitest browser mode
      !!globalThis.__vitest_browser__ || !!globalThis.window?.navigator?.userAgent?.match(/StorybookTestRunner/)
    );
  } catch {
    return !1;
  }
}
function pauseAnimations(atEnd = !0) {
  if (!("document" in globalThis && "createElement" in globalThis.document))
    return () => {
    };
  let disableStyle = document.createElement("style");
  disableStyle.textContent = `*, *:before, *:after {
    animation: none !important;
  }`, document.head.appendChild(disableStyle);
  let pauseStyle = document.createElement("style");
  return pauseStyle.textContent = `*, *:before, *:after {
    animation-delay: 0s !important;
    animation-direction: ${atEnd ? "reverse" : "normal"} !important;
    animation-play-state: paused !important;
    transition: none !important;
  }`, document.head.appendChild(pauseStyle), document.body.clientHeight, document.head.removeChild(disableStyle), () => {
    pauseStyle.parentNode?.removeChild(pauseStyle);
  };
}
async function waitForAnimations(signal) {
  if (!("document" in globalThis && "getAnimations" in globalThis.document && "querySelectorAll" in globalThis.document))
    return;
  let timedOut = !1;
  await Promise.race([
    // After 50ms, retrieve any running animations and wait for them to finish
    // If new animations are created while waiting, we'll wait for them too
    new Promise((resolve) => {
      setTimeout(() => {
        let animationRoots = [globalThis.document, ...getShadowRoots(globalThis.document)], checkAnimationsFinished = async () => {
          if (timedOut || signal?.aborted)
            return;
          let runningAnimations = animationRoots.flatMap((el) => el?.getAnimations?.() || []).filter((a) => a.playState === "running" && !isInfiniteAnimation(a));
          runningAnimations.length > 0 && (await Promise.all(runningAnimations.map((a) => a.finished)), await checkAnimationsFinished());
        };
        checkAnimationsFinished().then(resolve);
      }, 100);
    }),
    // If animations don't finish within the timeout, continue without waiting
    new Promise(
      (resolve) => setTimeout(() => {
        timedOut = !0, resolve(void 0);
      }, 5e3)
    )
  ]);
}
function getShadowRoots(doc) {
  return [doc, ...doc.querySelectorAll("*")].reduce((acc, el) => ("shadowRoot" in el && el.shadowRoot && acc.push(el.shadowRoot, ...getShadowRoots(el.shadowRoot)), acc), []);
}
function isInfiniteAnimation(anim) {
  if (anim instanceof CSSAnimation && anim.effect instanceof KeyframeEffect && anim.effect.target) {
    let style = getComputedStyle(anim.effect.target, anim.effect.pseudoElement), index = style.animationName?.split(", ").indexOf(anim.animationName);
    return style.animationIterationCount.split(", ")[index] === "infinite";
  }
  return !1;
}

export {
  isTestEnvironment,
  pauseAnimations,
  waitForAnimations
};
