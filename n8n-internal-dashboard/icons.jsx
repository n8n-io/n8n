// Inline SVG icons (Lucide-style strokes) — sized 1em, currentColor.
// Usage: <Icon name="layout-grid" />

window.Icon = function Icon({ name, size = 16, strokeWidth = 1.75, style }) {
  const props = {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth, strokeLinecap: "round", strokeLinejoin: "round",
    style: { flexShrink: 0, ...style },
    "aria-hidden": "true",
  };
  switch (name) {
    case "workflows":   return <svg {...props}><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M8 7 Q14 9 16 11"/><path d="M8 17 Q14 15 16 13"/></svg>;
    case "credentials": return <svg {...props}><rect x="3" y="10" width="18" height="11" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg>;
    case "executions":  return <svg {...props}><polygon points="6 4 20 12 6 20 6 4"/></svg>;
    case "variables":   return <svg {...props}><path d="M6 3h5a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H6Z"/><path d="M6 9h6a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H6Z"/></svg>;
    case "templates":   return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case "dashboards":  return <svg {...props}><rect x="3" y="3" width="8" height="10" rx="1.5"/><rect x="13" y="3" width="8" height="6" rx="1.5"/><rect x="13" y="11" width="8" height="10" rx="1.5"/><rect x="3" y="15" width="8" height="6" rx="1.5"/></svg>;
    case "settings":    return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>;
    case "help":        return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>;
    case "plus":        return <svg {...props}><path d="M12 5v14M5 12h14"/></svg>;
    case "search":      return <svg {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case "filter":      return <svg {...props}><path d="M4 5h16l-6 8v6l-4-2v-4Z"/></svg>;
    case "sort":        return <svg {...props}><path d="M8 6v12M4 14l4 4 4-4"/><path d="M16 18V6m-4 4 4-4 4 4"/></svg>;
    case "more":        return <svg {...props}><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/></svg>;
    case "more-v":      return <svg {...props}><circle cx="12" cy="5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="19" r="1.3" fill="currentColor"/></svg>;
    case "chevron-down":return <svg {...props}><path d="m6 9 6 6 6-6"/></svg>;
    case "chevron-right":return <svg {...props}><path d="m9 6 6 6-6 6"/></svg>;
    case "chevron-left":return <svg {...props}><path d="m15 6-6 6 6 6"/></svg>;
    case "x":           return <svg {...props}><path d="M6 6l12 12M18 6l-6 6-6 6"/></svg>;
    case "check":       return <svg {...props}><path d="M5 12.5 9.5 17l9.5-10"/></svg>;
    case "table":       return <svg {...props}><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 10h18M9 4v16"/></svg>;
    case "kanban":      return <svg {...props}><rect x="4"  y="4" width="4" height="16" rx="1"/><rect x="10" y="4" width="4" height="10" rx="1"/><rect x="16" y="4" width="4" height="13" rx="1"/></svg>;
    case "overview":    return <svg {...props}><rect x="3" y="3" width="8" height="6" rx="1"/><rect x="13" y="3" width="8" height="10" rx="1"/><rect x="3" y="11" width="8" height="10" rx="1"/><rect x="13" y="15" width="8" height="6" rx="1"/></svg>;
    case "calendar":    return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>;
    case "form":        return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M7 10h7M7 14h10"/></svg>;
    case "drag":        return <svg {...props}><circle cx="9"  cy="6"  r="1.3" fill="currentColor"/><circle cx="15" cy="6"  r="1.3" fill="currentColor"/><circle cx="9"  cy="12" r="1.3" fill="currentColor"/><circle cx="15" cy="12" r="1.3" fill="currentColor"/><circle cx="9"  cy="18" r="1.3" fill="currentColor"/><circle cx="15" cy="18" r="1.3" fill="currentColor"/></svg>;
    case "play":        return <svg {...props}><polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/></svg>;
    case "play-circle": return <svg {...props}><circle cx="12" cy="12" r="9"/><polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/></svg>;
    case "sparkles":    return <svg {...props}><path d="M12 3 13.5 8.5 19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5Z"/><path d="M19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7Z"/></svg>;
    case "wand":        return <svg {...props}><path d="M9 4v3M5.5 5.5 7 7M4 9h3M5.5 12.5 7 11"/><path d="M15 9 3 21"/><path d="m15 9 6-6 .5 .5L15.5 9.5z" fill="currentColor"/></svg>;
    case "code":        return <svg {...props}><path d="m8 18-6-6 6-6M16 6l6 6-6 6"/></svg>;
    case "database":    return <svg {...props}><ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></svg>;
    case "link":        return <svg {...props}><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1-1"/></svg>;
    case "lightning":   return <svg {...props}><path d="m13 2-9 13h7l-1 7 9-13h-7Z" /></svg>;
    case "trash":       return <svg {...props}><path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>;
    case "edit":        return <svg {...props}><path d="M4 20h4l11-11-4-4L4 16Z"/><path d="m13 5 4 4"/></svg>;
    case "copy":        return <svg {...props}><rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>;
    case "external":    return <svg {...props}><path d="M14 4h6v6M10 14 20 4M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/></svg>;
    case "star":        return <svg {...props}><polygon points="12 3 14.5 9 21 9.5 16 14 17.5 21 12 17.5 6.5 21 8 14 3 9.5 9.5 9"/></svg>;
    case "bell":        return <svg {...props}><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>;
    case "user":        return <svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>;
    case "users":       return <svg {...props}><circle cx="9" cy="8" r="4"/><path d="M1 21c0-4 4-7 8-7s8 3 8 7"/><path d="M16 4a4 4 0 0 1 0 8M21 21c0-3-2-5-5-6"/></svg>;
    case "building":    return <svg {...props}><rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9 16h2M13 16h2"/></svg>;
    case "money":       return <svg {...props}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 10v.01M18 10v.01"/></svg>;
    case "trend-up":    return <svg {...props}><path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>;
    case "trend-down":  return <svg {...props}><path d="m3 7 6 6 4-4 8 8"/><path d="M14 17h7v-7"/></svg>;
    case "target":      return <svg {...props}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>;
    case "globe":       return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>;
    case "phone":       return <svg {...props}><path d="M22 16v3a2 2 0 0 1-2 2 18 18 0 0 1-17-17 2 2 0 0 1 2-2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8.5 9a16 16 0 0 0 6 6l1.6-1.6a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6A2 2 0 0 1 22 16Z"/></svg>;
    case "mail":        return <svg {...props}><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="m3 7 9 7 9-7"/></svg>;
    case "calendar-event": return <svg {...props}><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M8 3v4M16 3v4M3 10h18M8 15h3"/></svg>;
    case "info":        return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="8" r=".5" fill="currentColor"/></svg>;
    case "alert":       return <svg {...props}><path d="m12 3 10 18H2Z"/><path d="M12 10v5"/><circle cx="12" cy="18" r=".5" fill="currentColor"/></svg>;
    case "draft":       return <svg {...props}><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/></svg>;
    case "open":        return <svg {...props}><path d="m9 6 6 6-6 6" /></svg>;
    case "graph":       return <svg {...props}><circle cx="6" cy="18" r="2"/><circle cx="12" cy="9"  r="2"/><circle cx="18" cy="14" r="2"/><path d="M7.5 16.8 10.5 10.5M13.5 9.7 16.5 12.7"/></svg>;
    case "globe-spark": return <svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="9"/></svg>;
  }
};
