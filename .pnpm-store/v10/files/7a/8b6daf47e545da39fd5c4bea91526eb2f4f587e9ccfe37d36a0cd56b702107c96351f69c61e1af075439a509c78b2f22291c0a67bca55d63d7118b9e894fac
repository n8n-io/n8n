import { basicSetup } from 'codemirror';
import { EditorView } from '@codemirror/view';
import { Compartment, EditorState } from '@codemirror/state';
import {getIndentUnit, indentUnit} from '@codemirror/language';
import { python } from '@codemirror/lang-python';
import { indentationMarkers } from '../src';

const doc = `
def read_file(path):
  with open(path, 'r') as file:
  
    print("opening file")
    text = file.read()
    
    file.close()
    
    if len(text) > 1000:
      print("thats a big file!")
      
    return text

def main():
  read_file("notes.txt")
`

const indentConf = new Compartment()

const view = new EditorView({
  state: EditorState.create({
    doc,

    extensions: [
      basicSetup,
      python(),
      indentConf.of(indentUnit.of('  ')),
      indentationMarkers(),
    ],
  }),
  parent: document.getElementById('editor'),
});

function toggleIndent() {
  const indent = (getIndentUnit(view.state) === 2) ? '    ' : '  '
  view.dispatch({ effects: indentConf.reconfigure(indentUnit.of(indent)) })
}

document.getElementById('toggleIndent').addEventListener('click', toggleIndent)