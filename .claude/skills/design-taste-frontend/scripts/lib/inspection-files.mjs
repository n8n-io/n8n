export const viewportClass = (width) => (width >= 1100 ? 'desktop' : width >= 600 ? 'tablet' : 'mobile');

export function screenshotLabel(width, widths) {
  const label = viewportClass(width);
  const sameClass = new Set(widths.filter((candidate) => viewportClass(candidate) === label));
  return sameClass.size > 1 ? `${label}-${width}` : label;
}

export const isInspectionScreenshot = (file) => /^(desktop|tablet|mobile)(?:-\d+)?-(fold|page-\d+|film-\d+)\.jpg$/.test(file);
