/* Swipe between the main tabs on phones (D89): Hier, Aujourd'hui, Matchs, Cote, Bilan.
   A swipe to the left opens the tab on the right, a swipe to the right the tab on the left.
   Shared by index.html (hash pages) and value.html (its own page). */
(() => {
  const TABS = ["hier", "", "matchs", "value", "bilan"];
  const onValue = /value\.html$/.test(location.pathname);
  const current = () => {
    if (onValue) return "value";
    const page = location.hash.replace(/^#\/?/, "").split("?")[0];
    return page === "tickets" ? "" : page === "match" ? "matchs" : page;
  };
  const go = (tab) => {
    if (tab === "value") { location.href = "value.html"; return; }
    if (onValue) { location.href = `./#/${tab}`; return; }
    location.hash = `#/${tab}`;
  };
  const calm = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const box = () => document.getElementById(onValue ? "root" : "app");
  // Slide the new page in from the side the finger came from.
  const slideIn = (dir) => {
    const el = box();
    if (!el || calm()) return;
    el.classList.remove("swipe-in-left", "swipe-in-right");
    void el.offsetWidth;
    el.classList.add(dir === "left" ? "swipe-in-left" : "swipe-in-right");
    setTimeout(() => el.classList.remove("swipe-in-left", "swipe-in-right"), 400);
  };

  // A touch that starts on a control, a chart or a strip that scrolls sideways is not a swipe.
  const blocked = (target) => {
    if (target.closest("input, textarea, select, canvas, [data-noswipe], .drawer:not(.hidden)")) return true;
    for (let el = target; el && el !== document.body; el = el.parentElement) {
      const ox = getComputedStyle(el).overflowX;
      if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth + 1) return true;
    }
    const side = document.getElementById("sidebar");
    return !!(side && side.classList.contains("open"));
  };

  let start = null;
  document.addEventListener("touchstart", (e) => {
    const t = e.touches[0];
    // Edges belong to the phone's own back gesture.
    start = e.touches.length === 1 && t.clientX > 24 && t.clientX < window.innerWidth - 24 && !blocked(e.target)
      ? { x: t.clientX, y: t.clientY, at: Date.now() } : null;
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x, dy = t.clientY - start.y, ms = Date.now() - start.at;
    start = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < 2 * Math.abs(dy) || ms > 700) return;
    if (window.getSelection && String(window.getSelection()).length) return;
    const i = TABS.indexOf(current());
    if (i < 0) return;
    const j = dx < 0 ? i + 1 : i - 1;
    if (j < 0 || j >= TABS.length) return;
    const dir = dx < 0 ? "left" : "right";
    try { sessionStorage.setItem("fi_swipe", dir); } catch { /* private mode */ }
    if (onValue || TABS[j] === "value") { go(TABS[j]); return; }
    // Hash pages render after their data arrive: animate when the content changes.
    const el = box();
    if (el && !calm()) {
      const obs = new MutationObserver(() => { obs.disconnect(); slideIn(dir); });
      obs.observe(el, { childList: true });
      setTimeout(() => obs.disconnect(), 4000);
    }
    go(TABS[j]);
  }, { passive: true });

  // After a full page load caused by a swipe (to or from value.html), slide the page in.
  window.addEventListener("pageshow", () => {
    let dir = null;
    try { dir = sessionStorage.getItem("fi_swipe"); sessionStorage.removeItem("fi_swipe"); } catch { /* private mode */ }
    if (dir) {
      const el = box();
      if (!el || !onValue) return;
      slideIn(dir);
    }
  });
})();
