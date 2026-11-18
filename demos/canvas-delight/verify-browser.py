"""Verify the running demo through its Orca browser page."""
import base64
import json
from pathlib import Path
import subprocess
import sys

page = sys.argv[1]
evidence = Path(__file__).parent / 'evidence'
evidence.mkdir(exist_ok=True)


def command(*args):
    response = json.loads(subprocess.check_output(['orca', *args, '--page', page, '--json']))
    if not response['ok']:
        raise RuntimeError(response)
    return response['result']


def evaluate(expression):
    response = command('eval', '--expression', expression)['result']
    return json.loads(response) if isinstance(response, str) else response


def shot(name):
    response = command('screenshot')
    (evidence / name).write_bytes(base64.b64decode(response['data']))


results = {}
command('exec', '--command', 'set viewport 1440 960')
command('reload')
command('wait', '--selector', '[data-testid="note-content"]')
results['baseline'] = evaluate('''(() => {
    const note = document.querySelector('[data-testid="note-content"]');
    window.__delightNote = note;
    window.__delightBaseline = {text:note.textContent, rect:note.getBoundingClientRect().toJSON(), style:note.getAttribute('style')};
    return window.__delightBaseline;
})()''')
results['sleepNow'] = evaluate('''(async () => {
    [...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='Sleep now').click();
    await new Promise(r=>setTimeout(r, 150));
    return [...document.querySelectorAll('[data-sleeping="true"]')].length === 1;
})()''')
shot('sleeping.png')
results['wakeOnActivity'] = evaluate('''(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight', bubbles:true}));
    await new Promise(r=>setTimeout(r, 40));
    return document.querySelectorAll('[data-sleeping="true"]').length === 0;
})()''')
results['idleSleep'] = evaluate('''(async () => {
    const slider = document.querySelector('#delay');
    slider.value = '2'; slider.dispatchEvent(new Event('input', {bubbles:true}));
    await new Promise(r=>setTimeout(r, 2200));
    return document.querySelectorAll('[data-sleeping="true"]').length === 1;
})()''')
results['cornerFlight'] = evaluate('''(async () => {
    document.querySelector('.origami-corner').click();
    await new Promise(r=>setTimeout(r, 600));
    document.querySelectorAll('.origami-flight, .origami-paper, .origami-wing').forEach(element=>element.getAnimations().forEach(animation=>{animation.pause(); animation.currentTime=1300;}));
    return document.querySelectorAll('[data-testid="origami-bird"]').length===1;
})()''')
shot('origami-flight.png')
results['restored'] = evaluate('''(async () => {
    await new Promise(r=>setTimeout(r, 3500));
    const note = document.querySelector('[data-testid="note-content"]');
    return note === window.__delightNote && JSON.stringify({text:note.textContent, rect:note.getBoundingClientRect().toJSON(), style:note.getAttribute('style')}) === JSON.stringify(window.__delightBaseline) && document.querySelectorAll('[data-testid="origami-bird"]').length===0;
})()''')
results['repeatFlights'] = evaluate('''(async () => {
    for(let i=0;i<2;i++) {
        [...document.querySelectorAll('button')].find(x=>x.textContent.includes('Fold the note')).click();
        await new Promise(r=>setTimeout(r, 3500));
        if(document.querySelector('[data-testid="origami-bird"]')) return false;
    }
    return document.querySelector('[data-testid="note-content"]') === window.__delightNote;
})()''')
results['reducedMotion'] = evaluate('''(async () => {
    [...document.querySelectorAll('label')].find(x=>x.textContent.includes('Reduce motion')).querySelector('input').click();
    await new Promise(r=>setTimeout(r, 30));
    document.querySelector('.origami-corner').click();
    await new Promise(r=>setTimeout(r, 30));
    const staticBird = getComputedStyle(document.querySelector('.origami-flight')).animationName === 'none';
    const visibleNote = getComputedStyle(document.querySelector('.origami-paper')).opacity === '1';
    await new Promise(r=>setTimeout(r, 700));
    return staticBird && visibleNote && !document.querySelector('[data-testid="origami-bird"]');
})()''')
results['cancelOnDisable'] = evaluate('''(async () => {
    const toggle = [...document.querySelectorAll('label')].find(x=>x.textContent.includes('Enable effects')).querySelector('input');
    document.querySelector('.origami-corner').click();
    toggle.click();
    await new Promise(r=>setTimeout(r, 50));
    const cleared = !document.querySelector('[data-testid="origami-bird"]') && !document.querySelector('[data-testid="canvas-sleep-effect"]') && document.querySelector('[data-testid="note-content"]')?.textContent === window.__delightBaseline.text;
    toggle.click();
    await new Promise(r=>setTimeout(r, 50));
    return cleared && document.querySelectorAll('[data-testid="canvas-sleep-effect"]').length === 6;
})()''')
evaluate('''(() => { [...document.querySelectorAll('label')].find(x=>x.textContent.includes('Reduce motion')).querySelector('input').click(); return true; })()''')
shot('restored.png')
(evidence / 'browser-results.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, indent=2))
assert all(value is True for key, value in results.items() if key != 'baseline'), results
