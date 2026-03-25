import { getIndentUnit } from '@codemirror/language';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import {
  Decoration,
  ViewPlugin,
  DecorationSet,
  EditorView,
  ViewUpdate,
  PluginValue,
} from '@codemirror/view';
import { getCurrentLine, getVisibleLines } from './utils';
import { IndentEntry, IndentationMap } from './map';
import { IndentationMarkerConfiguration, indentationMarkerConfig } from "./config";

// CSS classes:
// - .cm-indent-markers

function indentTheme(colorOptions: IndentationMarkerConfiguration['colors']) {
  const defaultColors = {
    light: '#F0F1F2',
    dark: '#2B3245',
    activeLight: '#E4E5E6',
    activeDark: '#3C445C',
  };

  let colors = defaultColors;
  if (colorOptions) {
    colors = {...defaultColors, ...colorOptions};
  }

  return EditorView.baseTheme({
    '&light': {
      '--indent-marker-bg-color': colors.light,
      '--indent-marker-active-bg-color': colors.activeLight,
    },
    
    '&dark': {
      '--indent-marker-bg-color': colors.dark,
      '--indent-marker-active-bg-color': colors.activeDark,
    },
  
    '.cm-line': {
      position: 'relative',
    },
  
    // this pseudo-element is used to draw the indent markers,
    // while still allowing the line to have its own background.
    '.cm-indent-markers::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      // .cm-line has a padding of 2px 
      // https://github.com/codemirror/view/blob/1c0a0880fc904714339f059658f3ba3a88bb8e6e/src/theme.ts#L85
      left: `2px`, 
      right: 0,
      bottom: 0,
      background: 'var(--indent-markers)',
      pointerEvents: 'none',
      zIndex: '-1',
    },
  });
}

function createGradient(markerCssProperty: string, thickness: number, indentWidth: number, startOffset: number, columns: number) {
  const gradient = `repeating-linear-gradient(to right, var(${markerCssProperty}) 0 ${thickness}px, transparent ${thickness}px ${indentWidth}ch)`
  // Subtract one pixel from the background width to get rid of artifacts of pixel rounding
  return `${gradient} ${startOffset * indentWidth}.5ch/calc(${indentWidth * columns}ch - 1px) no-repeat`
}

function makeBackgroundCSS(entry: IndentEntry, indentWidth: number, hideFirstIndent: boolean, thickness: number, activeThickness: number) {
  const { level, active } = entry;
  activeThickness = activeThickness ?? thickness;
  if (hideFirstIndent && level === 0) {
    return [];
  }
  const startAt = hideFirstIndent ? 1 : 0;
  const backgrounds = [];

  if (active !== undefined) {
    const markersBeforeActive = active - startAt - 1;
    if (markersBeforeActive > 0) {
      backgrounds.push(
        createGradient('--indent-marker-bg-color', thickness, indentWidth, startAt, markersBeforeActive),
      );
    }
    backgrounds.push(
      createGradient('--indent-marker-active-bg-color', activeThickness, indentWidth, active - 1, 1),
    );
    if (active !== level) {
      backgrounds.push(
        createGradient('--indent-marker-bg-color', thickness, indentWidth, active, level - active)
      );
    }
  } else {
    backgrounds.push(
      createGradient('--indent-marker-bg-color', thickness, indentWidth, startAt, level - startAt)
    );
  }

  return backgrounds.join(',');
}

class IndentMarkersClass implements PluginValue {
  view: EditorView;
  decorations!: DecorationSet;

  private unitWidth: number;
  private currentLineNumber: number;

  constructor(view: EditorView) {
    this.view = view;
    this.unitWidth = getIndentUnit(view.state);
    this.currentLineNumber = getCurrentLine(view.state).number;
    this.generate(view.state);
  }

  update(update: ViewUpdate) {
    const unitWidth = getIndentUnit(update.state);
    const unitWidthChanged = unitWidth !== this.unitWidth;
    if (unitWidthChanged) {
      this.unitWidth = unitWidth;
    }
    const lineNumber = getCurrentLine(update.state).number;
    const lineNumberChanged = lineNumber !== this.currentLineNumber;
    this.currentLineNumber = lineNumber;
    const activeBlockUpdateRequired = update.state.facet(indentationMarkerConfig).highlightActiveBlock && lineNumberChanged;
    if (
      update.docChanged ||
      update.viewportChanged ||
      unitWidthChanged ||
      activeBlockUpdateRequired
    ) {
      this.generate(update.state);
    }
  }

  private generate(state: EditorState) {
    const builder = new RangeSetBuilder<Decoration>();

    const lines = getVisibleLines(this.view, state);
    const { hideFirstIndent, markerType, thickness, activeThickness } = state.facet(indentationMarkerConfig);
    const map = new IndentationMap(lines, state, this.unitWidth, markerType);


    for (const line of lines) {
      const entry = map.get(line.number);

      if (!entry?.level) {
        continue;
      }

      const backgrounds = makeBackgroundCSS(entry, this.unitWidth, hideFirstIndent, thickness, activeThickness);

      builder.add(
        line.from,
        line.from,
        Decoration.line({
          class: 'cm-indent-markers',
          attributes: {
            style: `--indent-markers: ${backgrounds}`,
          },
        }),
      );
    }

    this.decorations = builder.finish();
  }
}

export function indentationMarkers(config: IndentationMarkerConfiguration = {}) {
  return [
    indentationMarkerConfig.of(config),
    indentTheme(config.colors),
    ViewPlugin.fromClass(IndentMarkersClass, {
      decorations: (v) => v.decorations,
    }),
  ];
}
