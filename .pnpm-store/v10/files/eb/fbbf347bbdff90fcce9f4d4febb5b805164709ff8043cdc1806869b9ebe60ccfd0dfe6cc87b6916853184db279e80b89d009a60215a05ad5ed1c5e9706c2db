/**
 * Copyright (c) 2017 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { TextureAtlas } from 'browser/renderer/shared/TextureAtlas';
import { ITerminalOptions, Terminal } from '@xterm/xterm';
import { ITerminal, ReadonlyColorSet } from 'browser/Types';
import { ICharAtlasConfig, ITextureAtlas } from 'browser/renderer/shared/Types';
import { generateConfig, configEquals } from 'browser/renderer/shared/CharAtlasUtils';

interface ITextureAtlasCacheEntry {
  atlas: ITextureAtlas;
  config: ICharAtlasConfig;
  // N.B. This implementation potentially holds onto copies of the terminal forever, so
  // this may cause memory leaks.
  ownedBy: Terminal[];
}

const charAtlasCache: ITextureAtlasCacheEntry[] = [];

/**
 * Acquires a char atlas, either generating a new one or returning an existing
 * one that is in use by another terminal.
 */
export function acquireTextureAtlas(
  terminal: Terminal,
  options: Required<ITerminalOptions>,
  colors: ReadonlyColorSet,
  deviceCellWidth: number,
  deviceCellHeight: number,
  deviceCharWidth: number,
  deviceCharHeight: number,
  devicePixelRatio: number
): ITextureAtlas {
  const newConfig = generateConfig(deviceCellWidth, deviceCellHeight, deviceCharWidth, deviceCharHeight, options, colors, devicePixelRatio);

  // Check to see if the terminal already owns this config
  for (let i = 0; i < charAtlasCache.length; i++) {
    const entry = charAtlasCache[i];
    const ownedByIndex = entry.ownedBy.indexOf(terminal);
    if (ownedByIndex >= 0) {
      if (configEquals(entry.config, newConfig)) {
        return entry.atlas;
      }
      // The configs differ, release the terminal from the entry
      if (entry.ownedBy.length === 1) {
        entry.atlas.dispose();
        charAtlasCache.splice(i, 1);
      } else {
        entry.ownedBy.splice(ownedByIndex, 1);
      }
      break;
    }
  }

  // Try match a char atlas from the cache
  for (let i = 0; i < charAtlasCache.length; i++) {
    const entry = charAtlasCache[i];
    if (configEquals(entry.config, newConfig)) {
      // Add the terminal to the cache entry and return
      entry.ownedBy.push(terminal);
      return entry.atlas;
    }
  }

  const core: ITerminal = (terminal as any)._core;
  const newEntry: ITextureAtlasCacheEntry = {
    atlas: new TextureAtlas(document, newConfig, core.unicodeService),
    config: newConfig,
    ownedBy: [terminal]
  };
  charAtlasCache.push(newEntry);
  return newEntry.atlas;
}

/**
 * Removes a terminal reference from the cache, allowing its memory to be freed.
 * @param terminal The terminal to remove.
 */
export function removeTerminalFromCache(terminal: Terminal): void {
  for (let i = 0; i < charAtlasCache.length; i++) {
    const index = charAtlasCache[i].ownedBy.indexOf(terminal);
    if (index !== -1) {
      if (charAtlasCache[i].ownedBy.length === 1) {
        // Remove the cache entry if it's the only terminal
        charAtlasCache[i].atlas.dispose();
        charAtlasCache.splice(i, 1);
      } else {
        // Remove the reference from the cache entry
        charAtlasCache[i].ownedBy.splice(index, 1);
      }
      break;
    }
  }
}
